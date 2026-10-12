import { api, apiRequest } from "./client.js";
import { resolveBackendUrl } from "../config/env.js";

const TOKEN_KEY = "myintimy_admin_token";

export function getAdminToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setAdminToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(headers = {}) {
  const token = getAdminToken();
  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
}

function adminGet(path, options = {}) {
  return api.get(`admin/${path}`, { ...options, headers: authHeaders(options.headers) });
}
function adminPost(path, body, options = {}) {
  return api.post(`admin/${path}`, body, { ...options, headers: authHeaders(options.headers) });
}
function adminPatch(path, body, options = {}) {
  return api.patch(`admin/${path}`, body, { ...options, headers: authHeaders(options.headers) });
}
function adminDelete(path, options = {}) {
  return api.delete(`admin/${path}`, { ...options, headers: authHeaders(options.headers) });
}

export const adminApi = {
  login: (email, password) => api.post("admin/auth/login", { email, password }),
  me: () => adminGet("auth/me"),
  dashboard: () => adminGet("dashboard"),

  categories: () => adminGet("categories"),
  createCategory: (payload) => adminPost("categories", payload),
  updateCategory: (id, payload) => adminPatch(`categories/${id}`, payload),
  deleteCategory: (id) => adminDelete(`categories/${id}`),

  products: (q = "") => adminGet(`products${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  product: (id) => adminGet(`products/${id}`),
  createProduct: (payload) => adminPost("products", payload),
  updateProduct: (id, payload) => adminPatch(`products/${id}`, payload),
  deleteProduct: (id) => adminDelete(`products/${id}`),

  colors: () => adminGet("colors"),
  createColor: (payload) => adminPost("colors", payload),
  updateColor: (id, payload) => adminPatch(`colors/${id}`, payload),
  deleteColor: (id) => adminDelete(`colors/${id}`),

  sizes: () => adminGet("sizes"),
  createSize: (payload) => adminPost("sizes", payload),
  updateSize: (id, payload) => adminPatch(`sizes/${id}`, payload),
  deleteSize: (id) => adminDelete(`sizes/${id}`),
  createVariant: (productId, payload) => adminPost(`products/${productId}/variants`, payload),
  updateVariant: (id, payload) => adminPatch(`variants/${id}`, payload),
  deleteVariant: (id) => adminDelete(`variants/${id}`),
  inventory: () => adminGet("inventory"),
  adjustStock: (id, payload) => adminPost(`variants/${id}/stock`, payload),
  movements: (id) => adminGet(`variants/${id}/movements`),

  uploadImage: (productId, formData) => apiRequest(`admin/products/${productId}/images`, {
    method: "POST",
    body: formData,
    headers: authHeaders(),
  }),
  updateImage: (id, payload) => adminPatch(`images/${id}`, payload),
  deleteImage: (id) => adminDelete(`images/${id}`),
};

export const mediaUrl = resolveBackendUrl;
