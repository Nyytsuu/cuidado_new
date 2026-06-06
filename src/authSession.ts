import { isNativeMobileRuntime } from "./sharedBackendFetch";

type StoredUser = {
  role?: string | null;
};

export const authStorageKeys = [
  "token",
  "role",
  "user",
  "userId",
  "keepLoggedIn",
  "admin_token",
  "clinic_token",
  "user_token",
];

export const clearStoredAuth = () => {
  authStorageKeys.forEach((key) => localStorage.removeItem(key));
  sessionStorage.removeItem("authSessionActive");
};

export const getStoredAuthRole = () => {
  const directRole = localStorage.getItem("role");

  if (directRole) {
    return directRole.toLowerCase();
  }

  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}") as StoredUser;
    return String(user.role || "").toLowerCase();
  } catch {
    return "";
  }
};

export const hasActiveAuthSession = () => {
  const hasStoredAuth =
    Boolean(localStorage.getItem("token")) &&
    Boolean(localStorage.getItem("user"));

  return (
    hasStoredAuth ||
    localStorage.getItem("keepLoggedIn") === "true" ||
    sessionStorage.getItem("authSessionActive") === "true"
  );
};

export const shouldClearTransientAuth = () => {
  // Auth should only be cleared from explicit logout. Some webviews drop
  // sessionStorage during route/runtime reloads while keeping localStorage.
  return false;
};

export const getActiveAuthDestination = () => {
  const token = localStorage.getItem("token");

  if (!token || !hasActiveAuthSession()) {
    return null;
  }

  const role = getStoredAuthRole() || "user";

  if (isNativeMobileRuntime() && role !== "user") {
    return null;
  }

  if (role === "admin") return "/admin/dashboard";
  if (role === "clinic") return "/clinic/dashboard";
  return "/homepage";
};
