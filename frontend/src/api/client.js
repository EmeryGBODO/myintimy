import { env } from "../config/env.js";
import { ApiError } from "./errors.js";

function resolveUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${env.apiBaseUrl}/${String(path).replace(/^\/+/, "")}`;
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

  try {
    const response = await fetch(resolveUrl(path), {
      ...options,
      method,
      body: payload,
      headers: requestHeaders,
      signal: controller.signal,
    });
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

export const api = {
  get: (path, options) => apiRequest(path, { ...options, method: "GET" }),
  post: (path, body, options) => apiRequest(path, { ...options, method: "POST", body }),
  put: (path, body, options) => apiRequest(path, { ...options, method: "PUT", body }),
  patch: (path, body, options) => apiRequest(path, { ...options, method: "PATCH", body }),
  delete: (path, options) => apiRequest(path, { ...options, method: "DELETE" }),
};
