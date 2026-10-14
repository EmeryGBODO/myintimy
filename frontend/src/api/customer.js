import { api, apiRequest } from "./client.js";

const TOKEN_KEY = "myintimy_customer_token";

export function getCustomerToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function setCustomerToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* stockage navigateur indisponible */ }
}

export function customerHeaders() {
  const token = getCustomerToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function authOptions(options = {}) {
  return { ...options, headers: { ...customerHeaders(), ...(options.headers || {}) } };
}

export const customerApi = {
  register: (payload) => api.post("client/auth/register", payload),
  login: (payload) => api.post("client/auth/login", payload),
  requestPasswordReset: (email) => api.post("client/auth/password-reset/request", { email }),
  confirmPasswordReset: (token, password) => api.post("client/auth/password-reset/confirm", { token, password }),
  profile: () => api.get("client/me", authOptions()),
  updateProfile: (payload) => api.patch("client/me", payload, authOptions()),
  addresses: {
    list: () => api.get("client/me/addresses", authOptions()),
    create: (payload) => api.post("client/me/addresses", payload, authOptions()),
    update: (id, payload) => api.put(`client/me/addresses/${id}`, payload, authOptions()),
    remove: (id) => api.delete(`client/me/addresses/${id}`, authOptions()),
  },
  favorites: {
    list: () => api.get("client/me/favorites", authOptions()),
    add: (identifier) => api.post(`client/me/favorites/${encodeURIComponent(identifier)}`, null, authOptions()),
    remove: (identifier) => api.delete(`client/me/favorites/${encodeURIComponent(identifier)}`, authOptions()),
  },
  orders: {
    list: () => api.get("client/me/orders", authOptions()),
    get: (reference) => api.get(`client/me/orders/${encodeURIComponent(reference)}`, authOptions()),
  },
};

export async function customerApiRequest(path, options = {}) {
  return apiRequest(path, authOptions(options));
}
