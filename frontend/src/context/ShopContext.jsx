import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addCartItem, calculateSubtotal, changeCartItemQty, removeCartItem } from "../domain/cart.js";
import { ShopContext } from "./shop-context.js";


// Stockage navigateur : simple confort, le site fonctionne sans.
const storage = {
  get(key, fallback, area = "localStorage") {
    try { const v = window[area].getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  },
  set(key, value, area = "localStorage") {
    try { window[area].setItem(key, JSON.stringify(value)); } catch { /* stockage indisponible */ }
  },
};

const systemDark = () => window.matchMedia?.("(prefers-color-scheme: dark)").matches;

export function ShopProvider({ children }) {
  /* Thème : null = suit le système */
  const [theme, setTheme] = useState(() => storage.get("myi-theme", null));
  const [sysDark, setSysDark] = useState(systemDark);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const on = () => setSysDark(mq.matches);
    mq?.addEventListener?.("change", on);
    return () => mq?.removeEventListener?.("change", on);
  }, []);
  useEffect(() => {
    if (theme) document.documentElement.dataset.theme = theme;
    storage.set("myi-theme", theme);
  }, [theme]);
  const isDark = theme ? theme === "dark" : sysDark;
  const toggleTheme = () => setTheme(isDark ? "light" : "dark");

  /* Panier & favoris */
  const [cart, setCart] = useState(() => storage.get("myi-cart", []));
  const [favs, setFavs] = useState(() => storage.get("myi-favs", []));
  useEffect(() => storage.set("myi-cart", cart), [cart]);
  useEffect(() => storage.set("myi-favs", favs), [favs]);

  /* Panneaux */
  const [panel, setPanel] = useState(null); // "cart" | "menu" | "search" | "sizes" | null
  useEffect(() => {
    document.body.style.overflow = panel ? "hidden" : "";
    const onKey = (e) => e.key === "Escape" && setPanel(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel]);

  /* Toast */
  const [toastMsg, setToastMsg] = useState("");
  const timer = useRef();
  const toast = useCallback((m) => {
    setToastMsg(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToastMsg(""), 2200);
  }, []);

  /* Vérification d'âge (mémorisée le temps de la visite) */
  const [ageOk, setAgeOk] = useState(() => storage.get("myi-18", false, "sessionStorage"));
  const confirmAge = () => { setAgeOk(true); storage.set("myi-18", true, "sessionStorage"); };

  const addToCart = (id, color, size, qty) => {
    setCart((c) => addCartItem(c, id, color, size, qty));
    setPanel("cart");
    toast("Ajouté à votre panier");
  };
  const changeQty = (key, delta) => setCart((c) => changeCartItemQty(c, key, delta));
  const removeItem = (key) => setCart((c) => removeCartItem(c, key));
  const clearCart = () => setCart([]);

  const toggleFav = (id) => {
    const has = favs.includes(id);
    setFavs((f) => (has ? f.filter((x) => x !== id) : [...f, id]));
    toast(has ? "Retiré de vos favoris" : "Ajouté à vos favoris");
  };

  const subtotal = useMemo(() => calculateSubtotal(cart), [cart]);
  const cartCount = cart.reduce((a, i) => a + i.qty, 0);

  const value = {
    isDark, toggleTheme,
    cart, cartCount, subtotal, addToCart, changeQty, removeItem, clearCart,
    favs, toggleFav, isFav: (id) => favs.includes(id),
    panel, openPanel: setPanel, closePanel: () => setPanel(null),
    toastMsg, toast, ageOk, confirmAge,
  };
  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

