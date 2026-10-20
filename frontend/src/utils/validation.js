export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^\+?[0-9\s.\-()]{5,30}$/;
export const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

export function isValidEmail(email) {
  if (!email || typeof email !== "string") return false;
  return EMAIL_REGEX.test(email.trim());
}

export function isValidPhone(phone) {
  if (!phone || typeof phone !== "string") return false;
  const trimmed = phone.trim();
  if (!PHONE_REGEX.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 5 && digits.length <= 20;
}

export function validateEmailField(email, { required = true } = {}) {
  const val = String(email || "").trim();
  if (!val) {
    return required ? "L'adresse e-mail est obligatoire." : null;
  }
  if (!isValidEmail(val)) {
    return "Format d'adresse e-mail invalide (ex: exemple@domaine.com).";
  }
  return null;
}

export function validatePhoneField(phone, { required = true } = {}) {
  const val = String(phone || "").trim();
  if (!val) {
    return required ? "Le numéro de téléphone est obligatoire." : null;
  }
  if (!isValidPhone(val)) {
    return "Numéro de téléphone invalide (au moins 5 chiffres, ex: +229 97 00 00 00).";
  }
  return null;
}

export function validateRequiredField(value, fieldName = "Ce champ") {
  const val = typeof value === "string" ? value.trim() : value;
  if (val === undefined || val === null || val === "") {
    return `${fieldName} est obligatoire.`;
  }
  return null;
}

export function validatePasswordField(password) {
  if (!password || password.length < 10) {
    return "Le mot de passe doit contenir au moins 10 caractères.";
  }
  return null;
}

export function validatePositiveInt(value, fieldName = "La valeur", { required = true } = {}) {
  if (value === "" || value === null || value === undefined) {
    return required ? `${fieldName} est obligatoire.` : null;
  }
  const num = Number(value);
  if (!Number.isInteger(num) || num < 0) {
    return `${fieldName} doit être un nombre entier positif ou nul.`;
  }
  return null;
}

export function validateAmount(value, fieldName = "Le montant", { min = 0, required = true } = {}) {
  if (value === "" || value === null || value === undefined) {
    return required ? `${fieldName} est obligatoire.` : null;
  }
  const num = Number(value);
  if (Number.isNaN(num) || num < min) {
    return `${fieldName} doit être un nombre supérieur ou égal à ${min}.`;
  }
  return null;
}

export function validateHexColor(color, fieldName = "La couleur", { required = true } = {}) {
  const val = String(color || "").trim();
  if (!val) {
    return required ? `${fieldName} est obligatoire.` : null;
  }
  if (!HEX_COLOR_REGEX.test(val)) {
    return "Le code couleur doit être au format hexadécimal (#RRGGBB).";
  }
  return null;
}

export function validateMinLength(value, minLength, fieldName = "Ce champ") {
  const val = String(value || "").trim();
  if (!val) {
    return `${fieldName} est obligatoire.`;
  }
  if (val.length < minLength) {
    return `${fieldName} doit comporter au moins ${minLength} caractères.`;
  }
  return null;
}

