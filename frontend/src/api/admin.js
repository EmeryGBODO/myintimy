import { api, apiRequest, clearCsrfToken } from "./client.js";
import { resolveBackendUrl } from "../config/env.js";

try { localStorage.removeItem("myintimy_admin_token"); } catch { /* ancien stockage non disponible */ }

function adminGet(path, options = {}) {
  return api.get(`admin/${path}`, options);
}
function adminPost(path, body, options = {}) {
  return api.post(`admin/${path}`, body, options);
}
function adminPatch(path, body, options = {}) {
  return api.patch(`admin/${path}`, body, options);
}
function adminDelete(path, options = {}) {
  return api.delete(`admin/${path}`, options);
}

export const adminApi = {
  login: (email, password) => api.post("admin/auth/login", { email, password }),
  logout: async () => {
    try { return await api.post("admin/auth/logout", null); }
    finally { clearCsrfToken("admin"); }
  },
  me: () => adminGet("auth/me"),
  dashboard: () => adminGet("dashboard"),

  orders: ({ q = "", status = "" } = {}) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    const query = params.toString();
    return adminGet(`orders${query ? `?${query}` : ""}`);
  },
  order: (id) => adminGet(`orders/${id}`),
  updateOrderStatus: (id, payload) => adminPatch(`orders/${id}/status`, payload),

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
  }),
  reorderImages: (productId, imageIds) => adminPatch(`products/${productId}/images/order`, { image_ids: imageIds }),
  updateImage: (id, payload) => adminPatch(`images/${id}`, payload),
  deleteImage: (id) => adminDelete(`images/${id}`),
};

export const mediaUrl = resolveBackendUrl;
