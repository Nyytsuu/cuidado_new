import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export default function AdminProtectedRoute({ children }: Props) {
  const token = localStorage.getItem("admin_token");

  if (!token) {
    return <Navigate to="/admin-signin" replace />;
  }

  return <>{children}</>;
}