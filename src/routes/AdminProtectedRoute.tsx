import { Navigate, Outlet } from "react-router-dom";

export default function AdminProtectedRoute() {
  const token = localStorage.getItem("admin_token");      // or admin_token if you use that
  const role = localStorage.getItem("role");        // "admin" | "clinic" | "user"

  if (!token) return <Navigate to="/signin" replace />;
  if (role !== "admin") return <Navigate to="/signin" replace />;

  return <Outlet />;
}