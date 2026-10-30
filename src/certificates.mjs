import { connect as tlsConnect } from "node:tls";
import { mapWithConcurrency } from "./check-runner.mjs";

const isText = (value) => typeof value === "string" && value.trim().length > 0;

export function validateCertificates(certificates) {
  const ids = new Set();
  certificates.forEach((certificate, index) => {
    const path = `certificates[${index}]`;
    if (!certificate || !isText(certificate.id) || !/^[a-z0-9][a-z0-9_-]*$/.test(certificate.id)) throw new Error(`${path}.id ist ungültig.`);
    if (ids.has(certificate.id)) throw new Error(`${path}.id ist doppelt vergeben.`);
    ids.add(certificate.id);
    if (!isText(certificate.name) || !isText(certificate.hostname)) throw new Error(`${path} benötigt name und hostname.`);
    const port = Number(certificate.port ?? 443);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`${path}.port ist ungültig.`);
    if (certificate["warning-days"] !== undefined && (!Number.isInteger(certificate["warning-days"]) || certificate["warning-days"] < 0)) {
      throw new Error(`${path}.warning-days ist ungültig.`);
    }
  });
  return certificates;
}

export function checkCertificate(certificate, { timeoutMs = 5000, connectImpl = tlsConnect } = {}) {
  return new Promise((resolve) => {
    const checkedAt = new Date().toISOString();
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({
        id: certificate.id,
        name: certificate.name,
        environment: certificate.environment,
        hostname: certificate.hostname,
        port: Number(certificate.port ?? 443),
        owner: certificate.owner,
        checkedAt,
        ...result
      });
    };
    const socket = connectImpl({
      host: certificate.hostname,
      port: Number(certificate.port ?? 443),
      servername: certificate["server-name"] ?? certificate.hostname,
      rejectUnauthorized: false
    });
    socket.setTimeout(timeoutMs, () => finish({ status: "down", detail: "TLS-Zeitüberschreitung" }));
    socket.once("error", (error) => finish({ status: "down", detail: String(error.message).slice(0, 180) }));
    socket.once("secureConnect", () => {
      const peer = socket.getPeerCertificate();
      if (!peer?.valid_to) {
        finish({ status: "down", detail: "Kein Zertifikat empfangen" });
        return;
      }
      const validTo = new Date(peer.valid_to);
      const daysRemaining = Math.ceil((validTo.getTime() - Date.now()) / 86_400_000);
      const trusted = certificate["reject-unauthorized"] === false || socket.authorized;
      const valid = Number.isFinite(validTo.getTime()) && daysRemaining >= 0;
      finish({
        status: trusted && valid ? "up" : "down",
        detail: !valid ? "Zertifikat ist abgelaufen" : !trusted ? String(socket.authorizationError || "Zertifikat nicht vertrauenswürdig") : `${daysRemaining} Tage gültig`,
        validTo: validTo.toISOString(),
        daysRemaining,
        issuer: peer.issuer?.O ?? peer.issuer?.CN ?? "Unbekannt",
        subject: peer.subject?.CN ?? certificate.hostname,
        expiring: valid && daysRemaining <= (certificate["warning-days"] ?? 30)
      });
    });
  });
}

export function createCertificateChecker(getCertificates, options = {}) {
  const ttlMs = options.ttlMs ?? 30000;
  let cache;
  let cachedAt = 0;
  let signature = "";
  return async function getCertificateStatuses() {
    const certificates = await getCertificates();
    const nextSignature = JSON.stringify(certificates);
    if (cache && signature === nextSignature && Date.now() - cachedAt < ttlMs) return cache;
    signature = nextSignature;
    cache = await mapWithConcurrency(certificates, options.concurrency ?? 8,
      (certificate) => checkCertificate(certificate, options));
    cachedAt = Date.now();
    return cache;
  };
}
