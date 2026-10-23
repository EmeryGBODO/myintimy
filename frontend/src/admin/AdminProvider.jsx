import { useCallback, useEffect, useMemo, useState } from "react";
import { adminApi } from "../api/admin.js";
import { AdminContext } from "./admin-context.js";

export function AdminProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    try { await adminApi.logout(); }
    finally { setUser(null); }
  }, []);

  useEffect(() => {
    adminApi.me().then(setUser).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const result = await adminApi.login(email, password);
    setUser(result.user);
    return result.user;
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout, authenticated: Boolean(user) }), [user, loading, login, logout]);
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export default AdminProvider;
