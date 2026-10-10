import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import AdminProvider from "./AdminProvider.jsx";
import { useAdmin } from "./admin-context.js";
import AdminLayout from "./AdminLayout.jsx";
import AdminCategories from "../pages/admin/AdminCategories.jsx";
import AdminDashboard from "../pages/admin/AdminDashboard.jsx";
import AdminInventory from "../pages/admin/AdminInventory.jsx";
import AdminLogin from "../pages/admin/AdminLogin.jsx";
import AdminProductForm from "../pages/admin/AdminProductForm.jsx";
import AdminProducts from "../pages/admin/AdminProducts.jsx";

function ProtectedAdmin() {
  const { authenticated, loading } = useAdmin();
  const location = useLocation();

  if (loading) {
    return <div className="grid min-h-[100dvh] place-items-center bg-bg text-sm text-muted">Chargement…</div>;
  }

  if (!authenticated) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return <AdminLayout />;
}

function RoutesTree() {
  const { authenticated } = useAdmin();

  return (
    <Routes>
      <Route path="/admin/login" element={authenticated ? <Navigate to="/admin" replace /> : <AdminLogin />} />
      <Route element={<ProtectedAdmin />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/products" element={<AdminProducts />} />
        <Route path="/admin/products/new" element={<AdminProductForm />} />
        <Route path="/admin/products/:id" element={<AdminProductForm />} />
        <Route path="/admin/categories" element={<AdminCategories />} />
        <Route path="/admin/inventory" element={<AdminInventory />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}

export default function AdminRoutes() {
  return (
    <AdminProvider>
      <RoutesTree />
    </AdminProvider>
  );
}
