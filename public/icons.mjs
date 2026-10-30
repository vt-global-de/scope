export const defaultIconBaseUrl = "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons";

const textIconPattern = /^[A-Z0-9<>/+._-]{1,4}$/;
const iconSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function iconSource(value, baseUrl = defaultIconBaseUrl) {
  if (typeof value !== "string" || !value.trim()) return null;
  const icon = value.trim();
  if (textIconPattern.test(icon)) return null;
  if (icon.startsWith("/")) return icon;
  try {
    const url = new URL(icon);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return iconSlugPattern.test(icon) ? `${baseUrl.replace(/\/+$/, "")}/svg/${icon}.svg` : null;
  }
}

export function iconFallback(value, name) {
  if (typeof value === "string" && textIconPattern.test(value.trim())) return value.trim();
  if (typeof value === "string" && iconSlugPattern.test(value.trim())) {
    return value.trim().split("-").map((part) => part[0]).join("").slice(0, 3).toUpperCase();
  }
  const initials = String(name ?? "").split(/[^\p{L}\p{N}]+/u).filter(Boolean)
    .map((part) => part[0]).join("").slice(0, 3).toUpperCase();
  return initials || "?";
}
