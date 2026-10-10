import { createContext, useContext } from "react";

export const AdminContext = createContext(null);

export function useAdmin() {
  const value = useContext(AdminContext);
  if (!value) throw new Error("useAdmin doit être utilisé dans AdminProvider.");
  return value;
}
