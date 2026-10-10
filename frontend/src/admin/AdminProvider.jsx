import { useCallback, useEffect, useMemo, useState } from "react";
import { adminApi, getAdminToken, setAdminToken } from "../api/admin.js";
import { AdminContext } from "./admin-context.js";

export default function AdminProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getAdminToken()));

  const logout = useCallback(() => {
    setAdminToken("");
    setUser(null);
  }, []);

  useEffect(() => {
    if (!getAdminToken()) return;
    adminApi.me().then(setUser).catch(logout).finally(() => setLoading(false));
  }, [logout]);

  const login = useCallback(async (email, password) => {
    const result = await adminApi.login(email, password);
    setAdminToken(result.access_token);
    setUser(result.user);
    return result.user;
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout, authenticated: Boolean(user) }), [user, loading, login, logout]);
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}
