export const ORDER_STATUS = {
  pending_payment: { label: "Attente paiement", tone: "warning" },
  confirmed: { label: "Confirmée", tone: "success" },
  preparing: { label: "Préparation", tone: "warning" },
  shipped: { label: "Expédiée", tone: "success" },
  delivered: { label: "Livrée", tone: "success" },
  cancelled: { label: "Annulée", tone: "danger" },
};

export const ORDER_TRANSITIONS = {
  pending_payment: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export function orderStatus(status) {
  return ORDER_STATUS[status] || { label: status || "Inconnu", tone: "neutral" };
}
