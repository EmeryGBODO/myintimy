const DEFAULT_API_BASE_URL = "http://localhost:8000/api/v1";

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function readBoolean(value, fallback = true) {
  if (value === undefined || value === null || value === "") return fallback;
  return !["0", "false", "no", "off"].includes(String(value).toLowerCase());
}

function resolveOrigin(value) {
  const fallbackOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost:5173";
  try {
    return new URL(value, fallbackOrigin).origin;
  } catch {
    return fallbackOrigin;
  }
}

const apiBaseUrl = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL);
const mediaBaseUrl = trimTrailingSlash(import.meta.env.VITE_MEDIA_BASE_URL || resolveOrigin(apiBaseUrl));

export function resolveBackendUrl(value) {
  if (!value) return "";
  const url = String(value);
  if (/^(?:https?:)?\/\//i.test(url) || /^data:/i.test(url) || /^blob:/i.test(url)) return url;
  return `${mediaBaseUrl}/${url.replace(/^\/+/, "")}`;
}

export const env = Object.freeze({
  apiBaseUrl,
  mediaBaseUrl,
  apiTimeoutMs: Number(import.meta.env.VITE_API_TIMEOUT_MS || 10000),
  catalogApiEnabled: readBoolean(import.meta.env.VITE_CATALOG_API_ENABLED, true),
});
