export function createFreeRdpInvocation(parameters, width, height) {
  const argumentsFromStdin = [
    `/v:${parameters.hostname}:${parameters.port}`,
    `/u:${parameters.username}`,
    `/p:${parameters.password}`,
    `/size:${width}x${height}`,
    "/network:auto",
    "+auto-reconnect",
    "+dynamic-resolution"
  ];
  if (parameters.domain) argumentsFromStdin.push(`/d:${parameters.domain}`);
  if (["nla", "tls", "rdp"].includes(parameters.security)) argumentsFromStdin.push(`/sec:${parameters.security}`);
  if (parameters["certificate-fingerprint"]) argumentsFromStdin.push(`/cert:fingerprint:${parameters["certificate-fingerprint"]}`);
  else if (parameters["ignore-cert"] === "true") argumentsFromStdin.push("/cert:ignore");
  else argumentsFromStdin.push("/cert:tofu");
  if (parameters.clipboard !== "false") argumentsFromStdin.push("+clipboard");
  if (parameters["keyboard-layout"]) argumentsFromStdin.push(`/kbd:${parameters["keyboard-layout"]}`);
  if (argumentsFromStdin.some((argument) => /[\r\n]/.test(argument))) {
    throw new Error("RDP-Parameter dürfen keine Zeilenumbrüche enthalten.");
  }
  return {
    commandArguments: ["/args-from:stdin"],
    standardInput: `${argumentsFromStdin.join("\n")}\n`
  };
}
