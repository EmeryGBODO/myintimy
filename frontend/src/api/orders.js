import { api } from "./client.js";

export const ordersApi = {
  create: (payload) => api.post("orders", payload),
};
