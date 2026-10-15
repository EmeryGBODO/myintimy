const SDK_URL = "https://cdn.kkiapay.me/k.js";
let sdkPromise;
let listenersBound = false;
let activePayment = null;

function loadSdk() {
  if (typeof window === "undefined") return Promise.reject(new Error("Le paiement nécessite un navigateur."));
  if (window.openKkiapayWidget && window.addSuccessListener && window.addFailedListener) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SDK_URL}"]`);
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", () => reject(new Error("Impossible de charger Kkiapay.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Impossible de charger Kkiapay."));
    document.body.appendChild(script);
  });
  return sdkPromise;
}

function bindListeners() {
  if (listenersBound) return;
  window.addSuccessListener((data) => {
    const current = activePayment;
    activePayment = null;
    current?.resolve(data);
  });
  window.addFailedListener((error) => {
    const current = activePayment;
    activePayment = null;
    current?.reject(Object.assign(new Error("Le paiement Mobile Money n'a pas été validé par l'opérateur."), { providerError: error }));
  });
  listenersBound = true;
}

export async function openKkiapayMobileMoney({ amount, publicKey, sandbox, customerName, phone, email, paymentId, orderReference }) {
  await loadSdk();
  bindListeners();

  if (!window.openKkiapayWidget) throw new Error("Le module Kkiapay n'est pas disponible.");
  if (activePayment) throw new Error("Un paiement est déjà en cours.");

  return new Promise((resolve, reject) => {
    activePayment = { resolve, reject };
    try {
      window.openKkiapayWidget({
        amount,
        key: publicKey,
        sandbox,
        position: "center",
        paymentmethod: "momo",
        countries: ["BJ"],
        name: customerName,
        phone,
        email: email || undefined,
        partnerId: paymentId,
        data: orderReference,
        theme: "#5B2A4E",
      });
    } catch (error) {
      activePayment = null;
      reject(error);
    }
  });
}
