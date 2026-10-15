import { api } from "./client.js";

export const paymentsApi = {
  kkiapayConfig: () => api.get("payments/kkiapay/config"),
  verifyKkiapay: (payload) => api.post("payments/kkiapay/verify", payload),
};
