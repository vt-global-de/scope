import { randomBytes } from "node:crypto";
import { connect as connectTcp } from "node:net";
import { connect as connectTls } from "node:tls";
import { createNotificationIconPng } from "./notification-brand.mjs";

const timeoutMs = 10_000;
const notificationIcon = createNotificationIconPng();

function cleanHeader(value) {
  return String(value ?? "").replace(/[\r\n]+/g, " ").trim();
}

function encodedHeader(value) {
  const cleaned = cleanHeader(value);
  return /^[\x20-\x7e]*$/.test(cleaned)
    ? cleaned
    : `=?UTF-8?B?${Buffer.from(cleaned, "utf8").toString("base64")}?=`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function truncate(value, maximum) {
  const text = String(value ?? "");
  return text.length > maximum ? `${text.slice(0, maximum - 1)}…` : text;
}

function base64Lines(value) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(String(value ?? ""), "utf8");
  return buffer.toString("base64").match(/.{1,76}/g)?.join("\n") ?? "";
}

function targetTypeLabel(value) {
  return ({
    service: "Service",
    monitoring: "Docker host",
    remote: "Remote access",
    certificate: "Certificate",
    dns: "DNS"
  })[value] ?? String(value ?? "Target");
}

function notificationBrand(instanceUrl) {
  if (!instanceUrl) return {};
  try {
    const parsed = new URL(instanceUrl);
    if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) return {};
    parsed.search = "";
    parsed.hash = "";
    const url = parsed.toString().replace(/\/$/, "");
    return { instanceUrl: url };
  } catch {
    return {};
  }
}

function htmlBrandHeader(appName, iconUrl) {
  return `<table role="presentation" style="width:100%;margin:0 0 22px;border-collapse:collapse"><tr>${iconUrl ? `<td style="width:54px;vertical-align:middle"><img src="${escapeHtml(iconUrl)}" width="44" height="44" alt="" style="display:block;width:44px;height:44px;border:0;border-radius:10px"></td>` : ""}<td style="vertical-align:middle"><div style="color:#fff;font-size:18px;font-weight:800">${escapeHtml(appName)}</div><div style="margin-top:3px;color:#71879a;font-size:12px;letter-spacing:.08em;text-transform:uppercase">Infrastructure scope</div></td></tr></table>`;
}

function htmlInstanceLink(appName, instanceUrl, color) {
  if (!instanceUrl) return "";
  return `<div style="margin-top:22px;text-align:center"><a href="${escapeHtml(instanceUrl)}" style="display:inline-block;border-radius:8px;padding:11px 18px;background:${color};color:#fff;font-size:14px;font-weight:800;text-decoration:none">Open ${escapeHtml(appName)} →</a><div style="margin-top:9px;color:#607485;font-size:11px;word-break:break-all">${escapeHtml(instanceUrl)}</div></div>`;
}

function mailbox(value) {
  const normalized = cleanHeader(value);
  const match = normalized.match(/<([^<>]+)>/);
  return (match?.[1] ?? normalized).trim();
}

class SmtpReader {
  constructor(socket) {
    this.buffer = "";
    this.current = [];
    this.responses = [];
    this.waiters = [];
    this.onData = (chunk) => this.push(chunk.toString("utf8"));
    this.onError = (error) => this.fail(error);
    this.onEnd = () => this.fail(new Error("SMTP-Verbindung wurde vorzeitig geschlossen."));
    socket.on("data", this.onData);
    socket.on("error", this.onError);
    socket.on("end", this.onEnd);
    this.socket = socket;
  }

  push(chunk) {
    this.buffer += chunk;
    while (this.buffer.includes("\n")) {
      const index = this.buffer.indexOf("\n");
      const line = this.buffer.slice(0, index).replace(/\r$/, "");
      this.buffer = this.buffer.slice(index + 1);
      const match = line.match(/^(\d{3})([ -])(.*)$/);
      if (!match) continue;
      this.current.push(line);
      if (match[2] === " ") {
        const response = { code: Number(match[1]), lines: this.current, text: this.current.join("\n") };
        this.current = [];
        const waiter = this.waiters.shift();
        if (waiter) waiter.resolve(response);
        else this.responses.push(response);
      }
    }
  }

  fail(error) {
    while (this.waiters.length) this.waiters.shift().reject(error);
  }

  next() {
    if (this.responses.length) return Promise.resolve(this.responses.shift());
    return new Promise((resolve, reject) => this.waiters.push({ resolve, reject }));
  }

  detach() {
    this.socket.off("data", this.onData);
    this.socket.off("error", this.onError);
    this.socket.off("end", this.onEnd);
  }
}

async function withTimeout(promise, message) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), timeoutMs); })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function connected(socket, event) {
  if ((event === "connect" && !socket.connecting) || (event === "secureConnect" && socket.secureConnecting === false)) return;
  await withTimeout(new Promise((resolve, reject) => {
    socket.once(event, resolve);
    socket.once("error", reject);
  }), "SMTP-Verbindungsaufbau hat das Zeitlimit überschritten.");
}

async function expect(reader, codes) {
  const response = await withTimeout(reader.next(), "SMTP-Server hat nicht rechtzeitig geantwortet.");
  if (!codes.includes(response.code)) throw new Error(`SMTP ${response.code}: ${response.lines.at(-1)?.slice(4) || "Unerwartete Antwort"}`);
  return response;
}

async function command(socket, reader, value, codes) {
  socket.write(`${value}\r\n`);
  return expect(reader, codes);
}

function messageData({ from, to, subject, text, html, brandIcon }) {
  const alternativeBoundary = `scope-alt-${randomBytes(12).toString("hex")}`;
  const relatedBoundary = `scope-related-${randomBytes(12).toString("hex")}`;
  const alternative = html ? [
    `--${alternativeBoundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    base64Lines(text),
    `--${alternativeBoundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    base64Lines(html),
    `--${alternativeBoundary}--`
  ].join("\n") : String(text);
  const body = html && brandIcon ? [
    `--${relatedBoundary}`,
    `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`,
    "",
    alternative,
    `--${relatedBoundary}`,
    "Content-Type: image/png; name=scope-notification-icon.png",
    "Content-Transfer-Encoding: base64",
    "Content-ID: <scope-notification-icon>",
    "Content-Disposition: inline; filename=scope-notification-icon.png",
    "",
    base64Lines(notificationIcon),
    `--${relatedBoundary}--`
  ].join("\n") : alternative;
  const safeBody = body.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
  const headers = [
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${randomBytes(16).toString("hex")}@scope.local>`,
    `From: ${cleanHeader(from)}`,
    `To: ${cleanHeader(to)}`,
    `Subject: ${encodedHeader(subject)}`,
    "MIME-Version: 1.0",
    html && brandIcon
      ? `Content-Type: multipart/related; boundary="${relatedBoundary}"`
      : html
        ? `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`
        : "Content-Type: text/plain; charset=UTF-8",
    ...(html ? [] : ["Content-Transfer-Encoding: 8bit"]),
    "",
    safeBody,
    ".",
    ""
  ];
  return headers.join("\r\n");
}

export async function sendSmtp(channel, message) {
  const port = channel.port ?? (channel.secure ? 465 : 587);
  let socket = channel.secure
    ? connectTls({ host: channel.hostname, port, servername: channel.hostname, rejectUnauthorized: true })
    : connectTcp({ host: channel.hostname, port });
  let reader = new SmtpReader(socket);
  try {
    await connected(socket, channel.secure ? "secureConnect" : "connect");
    await expect(reader, [220]);
    let capabilities = await command(socket, reader, "EHLO scope.local", [250]);
    if (!channel.secure && capabilities.text.toUpperCase().includes("STARTTLS")) {
      await command(socket, reader, "STARTTLS", [220]);
      reader.detach();
      socket = connectTls({ socket, servername: channel.hostname, rejectUnauthorized: true });
      reader = new SmtpReader(socket);
      await connected(socket, "secureConnect");
      capabilities = await command(socket, reader, "EHLO scope.local", [250]);
    }
    if (channel.username || channel.password) {
      if (!socket.encrypted) throw new Error("SMTP-Server bietet kein STARTTLS an; Zugangsdaten werden nicht unverschlüsselt übertragen.");
      await command(socket, reader, "AUTH LOGIN", [334]);
      await command(socket, reader, Buffer.from(channel.username).toString("base64"), [334]);
      await command(socket, reader, Buffer.from(channel.password).toString("base64"), [235]);
    }
    await command(socket, reader, `MAIL FROM:<${mailbox(channel.from)}>`, [250]);
    const recipients = channel.to.split(/[;,]/).map(mailbox).filter(Boolean);
    for (const recipient of recipients) await command(socket, reader, `RCPT TO:<${recipient}>`, [250, 251]);
    await command(socket, reader, "DATA", [354]);
    socket.write(messageData({ ...message, from: channel.from, to: channel.to }));
    await expect(reader, [250]);
    await command(socket, reader, "QUIT", [221]);
  } finally {
    reader.detach();
    socket.destroy();
  }
}

export async function sendDiscord(channel, message, fetchImpl = fetch) {
  const url = new URL(channel["webhook-url"]);
  if (url.protocol !== "https:" || !/(^|\.)discord(?:app)?\.com$/i.test(url.hostname)) {
    throw new Error("Discord-Webhook muss eine HTTPS-URL von discord.com sein.");
  }
  const presentation = message.discord ?? {};
  const embed = {
    title: truncate(presentation.title ?? message.subject, 256),
    description: truncate(presentation.description ?? message.text, 4096),
    color: presentation.color ?? 0x40c4cf,
    timestamp: message.timestamp ?? new Date().toISOString()
  };
  if (presentation.fields?.length) embed.fields = presentation.fields.map((field) => ({
    name: truncate(field.name, 256),
    value: truncate(field.value || "–", 1024),
    inline: field.inline === true
  })).slice(0, 25);
  if (presentation.footer) embed.footer = { text: truncate(presentation.footer, 2048) };
  if (presentation.url) embed.url = presentation.url;
  if (presentation.author) embed.author = presentation.author;
  if (presentation.thumbnail) embed.thumbnail = { url: presentation.thumbnail };
  const payload = {
    username: truncate(message.appName || "Scope", 80),
    allowed_mentions: { parse: [] },
    embeds: [embed]
  };
  let requestBody = JSON.stringify(payload);
  let headers = { "Content-Type": "application/json" };
  if (message.brandIcon) {
    const form = new FormData();
    form.append("payload_json", requestBody);
    form.append("files[0]", new Blob([notificationIcon], { type: "image/png" }), "scope-notification-icon.png");
    requestBody = form;
    headers = undefined;
  }
  const response = await fetchImpl(url, {
    method: "POST",
    ...(headers ? { headers } : {}),
    body: requestBody,
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!response.ok) throw new Error(`Discord-Webhook antwortete mit HTTP ${response.status}.`);
}

export function buildTestNotification(channel, { appName = "Scope", now = new Date(), instanceUrl } = {}) {
  const timestamp = now.toISOString();
  const channelName = channel.name || channel.type?.toUpperCase() || "Notification channel";
  const brand = notificationBrand(instanceUrl);
  return {
    appName,
    brandIcon: true,
    ...brand,
    timestamp,
    subject: `${appName}: Test notification successful`,
    text: [
      `✓ ${appName} notification test successful`,
      "",
      `Channel: ${channelName}`,
      `Time: ${timestamp}`,
      brand.instanceUrl ? `Open ${appName}: ${brand.instanceUrl}` : null,
      "",
      `This channel is ready to deliver ${appName} status alerts.`
    ].filter((line) => line !== null).join("\n"),
    html: `<!doctype html><html><body style="margin:0;background:#0f1720;color:#e6edf3;font-family:Arial,sans-serif"><div style="max-width:620px;margin:0 auto;padding:28px 18px"><div style="border:1px solid #263746;border-radius:14px;overflow:hidden;background:#16212b"><div style="height:5px;background:#40c4cf"></div><div style="padding:26px">${htmlBrandHeader(appName, "cid:scope-notification-icon")}<div style="color:#40c4cf;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">✓ Delivery test</div><h1 style="margin:10px 0 8px;font-size:24px;color:#fff">${escapeHtml(appName)} is connected</h1><p style="margin:0 0 22px;color:#aebdca;line-height:1.6">This channel is ready to deliver ${escapeHtml(appName)} status alerts.</p><table style="width:100%;border-collapse:collapse;font-size:14px"><tr><td style="padding:9px 0;color:#7f93a5">Channel</td><td style="padding:9px 0;text-align:right;color:#e6edf3">${escapeHtml(channelName)}</td></tr><tr><td style="padding:9px 0;color:#7f93a5">Time</td><td style="padding:9px 0;text-align:right;color:#e6edf3">${escapeHtml(timestamp)}</td></tr></table>${htmlInstanceLink(appName, brand.instanceUrl, "#238c96")}</div></div><p style="margin:14px 0 0;text-align:center;color:#607485;font-size:12px">Sent by ${escapeHtml(appName)}</p></div></body></html>`,
    discord: {
      title: `✅ ${appName} notification test`,
      description: "The channel is configured correctly and ready to deliver status alerts.",
      color: 0x40c4cf,
      fields: [
        { name: "Channel", value: channelName, inline: true },
        { name: "Result", value: "🟢 Delivery successful", inline: true },
        ...(brand.instanceUrl ? [{ name: "Instance", value: `[Open ${appName}](${brand.instanceUrl})`, inline: false }] : [])
      ],
      footer: `${appName} · Notification test`,
      ...(brand.instanceUrl ? { url: brand.instanceUrl } : {}),
      thumbnail: "attachment://scope-notification-icon.png"
    }
  };
}

export function buildStatusNotification(event, { appName = "Scope", now = new Date(), instanceUrl } = {}) {
  const recovered = event.status === "up";
  const status = recovered ? "RECOVERED" : "DOWN";
  const statusLabel = recovered ? "Available again" : "Unavailable";
  const icon = recovered ? "🟢" : "🔴";
  const color = recovered ? 0x2fb344 : 0xe5484d;
  const colorHex = recovered ? "#2fb344" : "#e5484d";
  const timestamp = now.toISOString();
  const type = targetTypeLabel(event.targetType);
  const detail = event.detail || (recovered ? "The target is responding normally again." : "The target did not respond to its health check.");
  const brand = notificationBrand(instanceUrl);
  return {
    appName,
    brandIcon: true,
    ...brand,
    timestamp,
    status: recovered ? "up" : "down",
    subject: `${icon} [${appName}] ${status} · ${event.name}`,
    text: [
      `${icon} ${event.name} — ${statusLabel}`,
      "",
      `Status: ${status}`,
      `Type: ${type}`,
      `Target: ${event.targetId}`,
      `Details: ${detail}`,
      `Time: ${timestamp}`,
      brand.instanceUrl ? `Open ${appName}: ${brand.instanceUrl}` : null,
      "",
      `Sent by ${appName}`
    ].filter((line) => line !== null).join("\n"),
    html: `<!doctype html><html><body style="margin:0;background:#0f1720;color:#e6edf3;font-family:Arial,sans-serif"><div style="max-width:620px;margin:0 auto;padding:28px 18px"><div style="border:1px solid #263746;border-radius:14px;overflow:hidden;background:#16212b"><div style="height:6px;background:${colorHex}"></div><div style="padding:26px">${htmlBrandHeader(appName, "cid:scope-notification-icon")}<div style="display:inline-block;border:1px solid ${colorHex};border-radius:999px;padding:6px 10px;color:${colorHex};font-size:12px;font-weight:800;letter-spacing:.08em">${icon} ${status}</div><h1 style="margin:16px 0 6px;font-size:24px;color:#fff">${escapeHtml(event.name)}</h1><p style="margin:0 0 22px;color:#aebdca;font-size:16px">${escapeHtml(statusLabel)}</p><table style="width:100%;border-collapse:collapse;font-size:14px"><tr><td style="padding:9px 0;color:#7f93a5">Type</td><td style="padding:9px 0;text-align:right;color:#e6edf3">${escapeHtml(type)}</td></tr><tr><td style="padding:9px 0;color:#7f93a5">Target</td><td style="padding:9px 0;text-align:right;color:#e6edf3">${escapeHtml(event.targetId)}</td></tr><tr><td style="padding:9px 0;color:#7f93a5">Time</td><td style="padding:9px 0;text-align:right;color:#e6edf3">${escapeHtml(timestamp)}</td></tr></table><div style="margin-top:20px;border-left:3px solid ${colorHex};border-radius:4px;padding:12px 14px;background:#101922;color:#c5d0da;line-height:1.5">${escapeHtml(detail)}</div>${htmlInstanceLink(appName, brand.instanceUrl, colorHex)}</div></div><p style="margin:14px 0 0;text-align:center;color:#607485;font-size:12px">Sent by ${escapeHtml(appName)}</p></div></body></html>`,
    discord: {
      title: `${icon} ${event.name} is ${status}`,
      description: recovered
        ? "The target has recovered and is responding normally again."
        : `${appName} detected that this target is currently unavailable.`,
      color,
      fields: [
        { name: "Status", value: `${icon} ${statusLabel}`, inline: true },
        { name: "Type", value: type, inline: true },
        { name: "Target", value: `\`${event.targetId}\``, inline: false },
        { name: "Details", value: detail, inline: false },
        ...(brand.instanceUrl ? [{ name: "Open Scope", value: `[Open ${appName}](${brand.instanceUrl})`, inline: false }] : [])
      ],
      footer: `${appName} · Infrastructure status`,
      ...(brand.instanceUrl ? { url: brand.instanceUrl } : {}),
      thumbnail: "attachment://scope-notification-icon.png"
    }
  };
}

export async function sendTestNotification(channel, { appName = "Scope", instanceUrl } = {}) {
  const message = buildTestNotification(channel, { appName, instanceUrl });
  if (channel.type === "smtp") await sendSmtp(channel, message);
  else if (channel.type === "discord") await sendDiscord(channel, message);
  else throw new Error(`Nicht unterstützter Notification-Typ: ${channel.type}`);
}

export async function sendStatusNotification(channel, event, { appName = "Scope", instanceUrl } = {}) {
  const message = buildStatusNotification(event, { appName, instanceUrl });
  if (channel.type === "smtp") await sendSmtp(channel, message);
  else if (channel.type === "discord") await sendDiscord(channel, message);
  else throw new Error(`Nicht unterstützter Notification-Typ: ${channel.type}`);
}
