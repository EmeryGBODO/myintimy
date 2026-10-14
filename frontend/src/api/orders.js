import { api } from "./client.js";
import { customerHeaders } from "./customer.js";

export const ordersApi = {
  create: (payload) => api.post("orders", payload, { headers: customerHeaders() }),
};
