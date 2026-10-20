export class ApiError extends Error {
  constructor(message, { status = 0, code = "API_ERROR", details = null, cause } = {}) {
    super(message, { cause });
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Normalise et traduit tout type d'erreur (ApiError, Error, string ou objet inconnu)
 * en un message clair en français, sans exposer de stack trace ou d'information technique brute.
 */
export function formatApiErrorMessage(error, fallback = "Une erreur inattendue est survenue.") {
  if (!error) return fallback;

  if (typeof error === "string") {
    if (error.startsWith("Erreur HTTP") || error.includes("Failed to fetch") || error.includes("NetworkError")) {
      return "Impossible de joindre le serveur. Veuillez vérifier votre connexion Internet.";
    }
    return error;
  }

  const code = error.code || "";
  const status = error.status || 0;
  const rawMessage = typeof error.message === "string" ? error.message.trim() : "";

  // 1. Erreurs réseau et connectivité
  if (code === "NETWORK_ERROR" || rawMessage.includes("Failed to fetch") || rawMessage.includes("NetworkError")) {
    return "Impossible de joindre le serveur Myintimy. Veuillez vérifier votre connexion Internet.";
  }

  // 2. Timeout / requête interrompue
  if (code === "REQUEST_ABORTED" || error.name === "TimeoutError" || rawMessage.includes("timed out")) {
    return "Le délai d'attente a été dépassé. Veuillez réessayer.";
  }

  // 3. Statuts serveur 500+ : toujours masquer les détails techniques internes
  if (status >= 500) {
    return "Le service rencontre temporairement une difficulté technique. Veuillez réessayer dans quelques instants.";
  }

  // 4. Codes d'authentification et de compte
  if (
    code === "INVALID_CUSTOMER_CREDENTIALS" ||
    code === "INVALID_ADMIN_CREDENTIALS" ||
    rawMessage.toLowerCase().includes("mot de passe") ||
    rawMessage.toLowerCase().includes("credential")
  ) {
    return "E-mail ou mot de passe incorrect.";
  }
  if (code === "CUSTOMER_DISABLED" || code === "ADMIN_DISABLED") {
    return "Ce compte n'est plus actif. Veuillez contacter le support.";
  }
  if (code === "CUSTOMER_ALREADY_EXISTS") {
    return "Un compte existe déjà avec cette adresse e-mail.";
  }
  if (code === "INVALID_CUSTOMER_TOKEN" || code === "INVALID_ADMIN_TOKEN") {
    return "Votre session a expiré ou est invalide. Veuillez vous reconnecter.";
  }
  if (code === "CUSTOMER_AUTH_REQUIRED" || code === "ADMIN_AUTH_REQUIRED") {
    return "Vous devez être connecté pour accéder à cette section.";
  }
  if (code === "RESET_TOKEN_EXPIRED" || code === "RESET_TOKEN_INVALID" || code === "RESET_TOKEN_USED") {
    return "Le lien de réinitialisation est invalide, expiré ou a déjà été utilisé.";
  }

  // 5. Codes catalogue & livraison
  if (code === "INSUFFICIENT_STOCK" || code === "VARIANT_UNAVAILABLE") {
    return "Le stock disponible a changé. Veuillez vérifier les articles de votre panier.";
  }
  if (code === "UNKNOWN_DELIVERY_ZONE") {
    return "La zone de livraison sélectionnée n'est pas reconnue.";
  }
  if (code === "INACTIVE_DELIVERY_ZONE") {
    return "Cette zone de livraison est temporairement indisponible.";
  }

  // 6. Message métier propre fourni par l'API
  const isGenericOrTechnical =
    !rawMessage ||
    rawMessage.startsWith("Erreur HTTP") ||
    rawMessage.toLowerCase() === "unauthorized" ||
    rawMessage.toLowerCase() === "forbidden" ||
    rawMessage.toLowerCase() === "not found" ||
    rawMessage.includes("at ") ||
    rawMessage.includes("Object.");

  if (!isGenericOrTechnical) {
    return rawMessage;
  }

  // 7. Statuts HTTP de repli (quand aucun message spécifique n'est disponible)
  if (status === 401) {
    return "Votre session a expiré ou vous n'êtes pas connecté.";
  }

  if (status === 403) {
    return "Vous n'avez pas l'autorisation d'effectuer cette action.";
  }

  if (status === 404) {
    return "La ressource demandée est introuvable.";
  }

  return fallback;
}
