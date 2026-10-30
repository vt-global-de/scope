# Security policy

## Supported versions

Security fixes are provided for the latest Scope 1.x release. Deployments should use an immutable version tag instead of `latest`.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Use the repository's private vulnerability reporting form under **Security → Advisories → Report a vulnerability**. Include the affected version, reproduction steps, impact and any suggested mitigation. Acknowledgement should be expected within seven days.

## Deployment boundary

Scope can reach Docker APIs and remote systems. Run it only behind HTTPS, restrict network access, use read-only credentials where possible and prefer a filtered Docker socket proxy over mounting the raw Docker socket. Protect `/metrics` with `METRICS_BEARER_TOKEN` when it is reachable outside a trusted monitoring network.
