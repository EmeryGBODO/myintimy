import { createContext, useContext } from "react";

export const ClientContext = createContext(null);

export function useClient() {
  const value = useContext(ClientContext);
  if (!value) throw new Error("useClient doit être utilisé sous <ClientProvider>.");
  return value;
}
