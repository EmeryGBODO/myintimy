import { api } from "./client.js";

export const shippingApi = {
  zones: () => api.get("shipping/zones"),
  quote: (city, subtotal_xof) => api.post("shipping/quote", { city, subtotal_xof }),
};

