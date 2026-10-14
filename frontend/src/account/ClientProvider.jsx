import { useCallback, useEffect, useMemo, useState } from "react";
import { customerApi, getCustomerToken, setCustomerToken } from "../api/customer.js";
import { ClientContext } from "./client-context.js";

export function ClientProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(Boolean(getCustomerToken()));

  const refresh = useCallback(async () => {
    if (!getCustomerToken()) {
      setCustomer(null);
      setLoading(false);
      return null;
    }
    setLoading(true);
    try {
      const profile = await customerApi.profile();
      setCustomer(profile);
      return profile;
    } catch (error) {
      if (error?.status === 401) setCustomerToken(null);
      setCustomer(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const acceptToken = useCallback(async (result) => {
    setCustomerToken(result.access_token);
    return refresh();
  }, [refresh]);

  const login = useCallback(async (payload) => acceptToken(await customerApi.login(payload)), [acceptToken]);
  const register = useCallback(async (payload) => acceptToken(await customerApi.register(payload)), [acceptToken]);
  const logout = useCallback(() => {
    setCustomerToken(null);
    setCustomer(null);
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
