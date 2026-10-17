import { api, apiRequest, clearCsrfToken } from "./client.js";

try { localStorage.removeItem("myintimy_customer_token"); } catch { /* ancien stockage non disponible */ }

export const customerApi = {
  register: (payload) => api.post("client/auth/register", payload),
  login: (payload) => api.post("client/auth/login", payload),
  logout: async () => {
    try { return await api.post("client/auth/logout", null); }
    finally { clearCsrfToken("customer"); }
  },
  requestPasswordReset: (email) => api.post("client/auth/password-reset/request", { email }),
  confirmPasswordReset: (token, password) => api.post("client/auth/password-reset/confirm", { token, password }),
  profile: () => api.get("client/me"),
  updateProfile: (payload) => api.patch("client/me", payload),
  addresses: {
    list: () => api.get("client/me/addresses"),
    create: (payload) => api.post("client/me/addresses", payload),
    update: (id, payload) => api.put(`client/me/addresses/${id}`, payload),
    remove: (id) => api.delete(`client/me/addresses/${id}`),
  },
  favorites: {
    list: () => api.get("client/me/favorites"),
    add: (identifier) => api.post(`client/me/favorites/${encodeURIComponent(identifier)}`, null),
    remove: (identifier) => api.delete(`client/me/favorites/${encodeURIComponent(identifier)}`),
  },
  orders: {
    list: () => api.get("client/me/orders"),
    get: (reference) => api.get(`client/me/orders/${encodeURIComponent(reference)}`),
  },
};

export async function customerApiRequest(path, options = {}) {
  return apiRequest(path, options);
}
