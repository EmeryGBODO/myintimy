import { createContext, useContext } from "react";

export const ShopContext = createContext(null);

export function useShop() {
  const value = useContext(ShopContext);

  if (value === null) {
    throw new Error("useShop doit être utilisé sous <ShopProvider>.");
  }

  return value;
}
