const DEFAULT_BACKEND_URL = "http://localhost:5000";
const PRODUCTION_BACKEND_URL = "https://cuidado-new.onrender.com";
const ANDROID_EMULATOR_BACKEND_URL = "http://10.0.2.2:5000";

declare global {
  interface Window {
    CUIDADO_BACKEND_URL?: string;
    Capacitor?: {
      getPlatform?: () => string;
      isNativePlatform?: () => boolean;
    };
  }
}

const queryBackendUrl = new URLSearchParams(window.location.search).get("apiBase");

const normalizeBackendUrl = (url: string) => url.replace(/\/$/, "");

const isLocalBackendUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  } catch {
    return false;
  }
};

const isAndroidUserAgent = () => /Android/i.test(navigator.userAgent);

const isLocalFrontendHost = () =>
  ["localhost", "127.0.0.1", "::1", ""].includes(window.location.hostname);

export const isNativeMobileRuntime = () => {
  const platform = window.Capacitor?.getPlatform?.();

  if (platform) {
    return platform === "android" || platform === "ios";
  }

  const nativePlatform = window.Capacitor?.isNativePlatform?.() ?? false;

  if (nativePlatform) {
    return true;
  }

  return ["capacitor:", "ionic:"].includes(window.location.protocol);
};

export const isAndroidNativeRuntime = () => {
  const platform = window.Capacitor?.getPlatform?.();

  if (platform) {
    return platform === "android";
  }

  return isNativeMobileRuntime() && isAndroidUserAgent();
};

const shouldUseAndroidEmulatorBackend = (envBackendUrl: string) => {
  if (!isLocalBackendUrl(envBackendUrl)) {
    return false;
  }

  // Physical device with ADB reverse (adb reverse tcp:5000 tcp:5000) can reach
  // localhost:5000 directly — only use the emulator address (10.0.2.2) when
  // running inside the Android emulator without a native Capacitor runtime.
  if (isNativeMobileRuntime()) {
    return false;
  }

  return (
    isAndroidUserAgent() &&
    ["localhost", "127.0.0.1", ""].includes(window.location.hostname)
  );
};

export const getConfiguredBackendUrl = () => {
  const explicitRuntimeUrl = window.CUIDADO_BACKEND_URL || queryBackendUrl;

  if (explicitRuntimeUrl) {
    return normalizeBackendUrl(explicitRuntimeUrl);
  }

  const defaultBackendUrl = isLocalFrontendHost()
    ? DEFAULT_BACKEND_URL
    : PRODUCTION_BACKEND_URL;

  const envBackendUrl =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    defaultBackendUrl;

  if (shouldUseAndroidEmulatorBackend(envBackendUrl)) {
    return ANDROID_EMULATOR_BACKEND_URL;
  }

  return normalizeBackendUrl(envBackendUrl);
};

export const apiUrl = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getConfiguredBackendUrl()}${normalizedPath}`;
};

// Public endpoints that should NEVER trigger auto-logout on 401
const PUBLIC_PATHS = [
  "/api/login",
  "/api/mobile/login",
  "/api/signup",
  "/api/auth/",
  "/api/clinic/signup",
  "/api/clinic/public/services",
];

const isPublicEndpoint = (url: string): boolean =>
  PUBLIC_PATHS.some((p) => url.includes(p));

// Guards against duplicate logout redirects if several requests 401 at once
let _loggingOut = false;

const STORED_AUTH_KEYS = [
  "token", "role", "user", "userId", "keepLoggedIn",
  "admin_token", "clinic_token", "user_token",
];

const originalFetch = window.fetch.bind(window);

window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const configuredBackendUrl = getConfiguredBackendUrl();

  // Resolve the full URL string for inspection
  const rawUrl =
    input instanceof URL
      ? input.href
      : typeof input === "string"
      ? input
      : "";

  const isBackendCall =
    rawUrl.startsWith(DEFAULT_BACKEND_URL) ||
    rawUrl.startsWith(configuredBackendUrl);

  if (!isBackendCall) {
    return originalFetch(input, init);
  }

  // Normalise localhost → configured URL
  let normalizedInput: RequestInfo | URL = input;
  if (typeof input === "string" && input.startsWith(DEFAULT_BACKEND_URL)) {
    normalizedInput = input.replace(DEFAULT_BACKEND_URL, configuredBackendUrl);
  } else if (input instanceof URL && input.href.startsWith(DEFAULT_BACKEND_URL)) {
    normalizedInput = new URL(input.href.replace(DEFAULT_BACKEND_URL, configuredBackendUrl));
  }

  // Auto-attach Authorization header when a token is present
  try {
    const token =
      typeof localStorage !== "undefined" ? localStorage.getItem("token") : null;

    if (token) {
      const isFormData = init?.body instanceof FormData;
      const existing = init?.headers;

      // Build a fresh Headers object so we can check for existing Authorization
      const headers = existing instanceof Headers
        ? new Headers(existing)
        : new Headers(existing as Record<string, string> | undefined);

      if (!headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      // Only set Content-Type automatically for non-FormData JSON requests
      if (!isFormData && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }

      init = { ...init, headers };
    }
  } catch {
    // localStorage unavailable (SSR / incognito edge cases) — carry on
  }

  return originalFetch(normalizedInput, init).then((response) => {
    // Auto-logout on token expiry / invalid token (skip public auth endpoints)
    if (
      response.status === 401 &&
      !isPublicEndpoint(rawUrl) &&
      !_loggingOut
    ) {
      _loggingOut = true;
      try {
        STORED_AUTH_KEYS.forEach((k) => localStorage.removeItem(k));
        sessionStorage.removeItem("authSessionActive");
      } catch {
        // ignore storage errors
      }
      // Small delay so the current response can finish before redirect
      setTimeout(() => {
        window.location.href = "/signin";
      }, 100);
    }
    return response;
  });
};
