export const ORDER_STATUS = {
  pending_payment: { label: "Attente paiement", tone: "warning" },
  pending_confirmation: { label: "Commande reçue", tone: "warning" },
  confirmed: { label: "Prise en charge", tone: "success" },
  preparing: { label: "Préparation", tone: "warning" },
  shipped: { label: "Colis envoyé", tone: "success" },
  delivered: { label: "Livraison effectuée", tone: "success" },
  cancelled: { label: "Annulée", tone: "danger" },
};

export const ORDER_TRANSITIONS = {
  pending_payment: ["cancelled"],
  pending_confirmation: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export function orderStatus(status) {
  return ORDER_STATUS[status] || { label: status || "Inconnu", tone: "neutral" };
}
