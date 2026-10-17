import { env } from "../config/env.js";
import { ApiError } from "./errors.js";

const csrfTokens = { admin: "", customer: "" };
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function resolveUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${env.apiBaseUrl}/${String(path).replace(/^\/+/, "")}`;
}

function csrfScope(path) {
  const normalized = String(path).replace(/^\/+/, "");
  return normalized.startsWith("admin/") ? "admin" : "customer";
}

async function parseResponse(response) {
  if (response.status === 204) return null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return response.json();
  return response.text();
}

export async function apiRequest(path, { method = "GET", body, headers = {}, timeoutMs = env.apiTimeoutMs, signal, ...options } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new DOMException("Request timed out", "TimeoutError")), timeoutMs);

  if (signal) {
    if (signal.aborted) controller.abort(signal.reason);
    else signal.addEventListener("abort", () => controller.abort(signal.reason), { once: true });
  }

  const requestHeaders = new Headers(headers);
  let payload = body;
  if (body !== undefined && body !== null && !(body instanceof FormData)) {
    requestHeaders.set("Content-Type", "application/json");
    payload = JSON.stringify(body);
  }
  requestHeaders.set("Accept", "application/json");

  const normalizedMethod = method.toUpperCase();
  const scope = csrfScope(path);
  if (!SAFE_METHODS.has(normalizedMethod) && csrfTokens[scope]) {
    requestHeaders.set("X-CSRF-Token", csrfTokens[scope]);
  }

  try {
    const response = await fetch(resolveUrl(path), {
      ...options,
      method: normalizedMethod,
      body: payload,
      headers: requestHeaders,
      credentials: "include",
      signal: controller.signal,
    });

    const csrfToken = response.headers.get("X-CSRF-Token");
    if (csrfToken) csrfTokens[scope] = csrfToken;

    const data = await parseResponse(response);
    if (!response.ok) {
      const error = data?.error;
      throw new ApiError(error?.message || `Erreur HTTP ${response.status}`, {
        status: response.status,
        code: error?.code || `HTTP_${response.status}`,
        details: error?.details ?? null,
      });
    }
    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted) {
      throw new ApiError("La requête a expiré ou a été annulée.", { code: "REQUEST_ABORTED", cause: error });
    }
    throw new ApiError("Impossible de joindre le service Myintimy.", { code: "NETWORK_ERROR", cause: error });
  } finally {
    clearTimeout(timeout);
  }
}

export function clearCsrfToken(scope) {
  if (scope in csrfTokens) csrfTokens[scope] = "";
}

export const api = {
  get: (path, options) => apiRequest(path, { ...options, method: "GET" }),
  post: (path, body, options) => apiRequest(path, { ...options, method: "POST", body }),
  put: (path, body, options) => apiRequest(path, { ...options, method: "PUT", body }),
  patch: (path, body, options) => apiRequest(path, { ...options, method: "PATCH", body }),
  delete: (path, options) => apiRequest(path, { ...options, method: "DELETE" }),
};
