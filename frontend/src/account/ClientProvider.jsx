import { useCallback, useEffect, useMemo, useState } from "react";
import { customerApi } from "../api/customer.js";
import { ClientContext } from "./client-context.js";

export function ClientProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const profile = await customerApi.profile();
      setCustomer(profile);
      return profile;
    } catch {
      setCustomer(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = useCallback(async (payload) => {
    await customerApi.login(payload);
    return refresh();
  }, [refresh]);

  const register = useCallback(async (payload) => {
    await customerApi.register(payload);
    return refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try { await customerApi.logout(); }
    finally { setCustomer(null); }
  }, []);

  const value = useMemo(() => ({
    customer,
    loading,
    isAuthenticated: Boolean(customer),
    login,
    register,
    logout,
    refresh,
  }), [customer, loading, login, register, logout, refresh]);

  return <ClientContext.Provider value={value}>{children}</ClientContext.Provider>;
}
