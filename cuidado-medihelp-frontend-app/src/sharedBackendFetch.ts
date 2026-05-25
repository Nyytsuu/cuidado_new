const DEFAULT_BACKEND_URL = "http://localhost:5000";
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

  if (isAndroidNativeRuntime()) {
    return true;
  }

  return isAndroidUserAgent() && ["localhost", "127.0.0.1", ""].includes(window.location.hostname);
};

const getBackendUrlFromCurrentHost = () => {
  const { protocol, hostname } = window.location;

  if (!hostname || isLocalBackendUrl(`${protocol}//${hostname}`)) {
    return "";
  }

  return `${protocol}//${hostname}:5000`;
};

export const getConfiguredBackendUrl = () => {
  const explicitRuntimeUrl = window.CUIDADO_BACKEND_URL || queryBackendUrl;

  if (explicitRuntimeUrl) {
    return normalizeBackendUrl(explicitRuntimeUrl);
  }

  const envBackendUrl = import.meta.env.VITE_API_BASE_URL || DEFAULT_BACKEND_URL;

  if (isLocalBackendUrl(envBackendUrl)) {
    const inferredBackendUrl = getBackendUrlFromCurrentHost();

    if (inferredBackendUrl) {
      return inferredBackendUrl;
    }
  }

  if (shouldUseAndroidEmulatorBackend(envBackendUrl)) {
    return ANDROID_EMULATOR_BACKEND_URL;
  }

  return normalizeBackendUrl(envBackendUrl);
};

export const apiUrl = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getConfiguredBackendUrl()}${normalizedPath}`;
};

const originalFetch = window.fetch.bind(window);

window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const configuredBackendUrl = getConfiguredBackendUrl();

  // Normalise localhost → configured URL
  let normalizedInput: RequestInfo | URL = input;
  if (typeof input === "string" && input.startsWith(DEFAULT_BACKEND_URL)) {
    normalizedInput = input.replace(DEFAULT_BACKEND_URL, configuredBackendUrl);
  } else if (input instanceof URL && input.href.startsWith(DEFAULT_BACKEND_URL)) {
    normalizedInput = new URL(input.href.replace(DEFAULT_BACKEND_URL, configuredBackendUrl));
  }

  // Check if this is a backend call so we can attach auth headers
  const rawUrl =
    normalizedInput instanceof URL
      ? normalizedInput.href
      : typeof normalizedInput === "string"
      ? normalizedInput
      : "";

  const isBackendCall = rawUrl.startsWith(configuredBackendUrl);

  if (isBackendCall) {
    try {
      const token =
        typeof localStorage !== "undefined" ? localStorage.getItem("token") : null;

      if (token) {
        const existing = init?.headers;
        const headers =
          existing instanceof Headers
            ? new Headers(existing)
            : new Headers(existing as Record<string, string> | undefined);

        if (!headers.has("Authorization")) {
          headers.set("Authorization", `Bearer ${token}`);
        }

        if (!(init?.body instanceof FormData) && !headers.has("Content-Type")) {
          headers.set("Content-Type", "application/json");
        }

        init = { ...init, headers };
      }
    } catch {
      // localStorage unavailable — carry on
    }
  }

  return originalFetch(normalizedInput, init);
};
