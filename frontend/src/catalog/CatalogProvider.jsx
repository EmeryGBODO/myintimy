import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchCatalog } from "../api/catalog.js";
import { env } from "../config/env.js";
import { CATEGORIES as LOCAL_CATEGORIES, PRODUCTS as LOCAL_PRODUCTS } from "../data/catalog.js";
import { CatalogContext } from "./catalog-context.js";

const localState = {
  products: LOCAL_PRODUCTS,
  categories: LOCAL_CATEGORIES,
  source: "local",
  loading: false,
  error: null,
};

export function CatalogProvider({ children }) {
  const [state, setState] = useState(localState);

  const refresh = useCallback(async () => {
    if (!env.catalogApiEnabled) {
      setState(localState);
      return;
    }
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const remote = await fetchCatalog();
      if (!remote.products.length) throw new Error("Le catalogue API est vide.");
      setState({ ...remote, categories: { ...remote.categories, nouveautes: LOCAL_CATEGORIES.nouveautes }, source: "api", loading: false, error: null });
    } catch (error) {
      setState({ ...localState, error, loading: false });
    }
  }, []);

  useEffect(() => {
    let active = true;
    if (!env.catalogApiEnabled) return undefined;
    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true, error: null }));
    fetchCatalog({ signal: controller.signal })
      .then((remote) => {
        if (!active) return;
        if (!remote.products.length) {
          setState({ ...localState, error: new Error("Le catalogue API est vide."), loading: false });
          return;
        }
        setState({ ...remote, categories: { ...remote.categories, nouveautes: LOCAL_CATEGORIES.nouveautes }, source: "api", loading: false, error: null });
      })
      .catch((error) => {
        if (active && error?.code !== "REQUEST_ABORTED") setState({ ...localState, error, loading: false });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const getProduct = useCallback((identifier) => {
    const raw = String(identifier);
    const match = (product) => String(product.id) === raw || product.slug === raw || String(product.backendId || "") === raw;
    const current = state.products.find(match);
    if (current) return current;
    return state.source === "local" ? LOCAL_PRODUCTS.find(match) : undefined;
  }, [state.products, state.source]);

  const value = useMemo(() => ({
    ...state,
    getProduct,
    hasCategory: (slug) => slug === "nouveautes" || Boolean(state.categories[slug]),
    refresh,
  }), [state, getProduct, refresh]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}
