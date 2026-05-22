import { Navigate, Outlet } from "react-router-dom";

export default function UserProtectedRoute() {
  const token = localStorage.getItem("token");
  const user = localStorage.getItem("user");
  const role = localStorage.getItem("role");

  if (!token || !user) {
    return <Navigate to="/signin" replace />;
  }

  if (role !== "user") {
    return <Navigate to="/signin" replace />;
  }

  return <Outlet />;
}