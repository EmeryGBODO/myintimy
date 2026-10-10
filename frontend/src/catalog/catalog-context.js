import { createContext, useContext } from "react";

export const CatalogContext = createContext(null);

export function useCatalog() {
  const value = useContext(CatalogContext);
  if (!value) throw new Error("useCatalog doit être utilisé dans CatalogProvider");
  return value;
}
