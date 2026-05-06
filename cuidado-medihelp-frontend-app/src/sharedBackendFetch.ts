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
  if (typeof input === "string" && input.startsWith(DEFAULT_BACKEND_URL)) {
    const configuredBackendUrl = getConfiguredBackendUrl();
    return originalFetch(input.replace(DEFAULT_BACKEND_URL, configuredBackendUrl), init);
  }

  if (input instanceof URL && input.href.startsWith(DEFAULT_BACKEND_URL)) {
    const configuredBackendUrl = getConfiguredBackendUrl();
    return originalFetch(
      new URL(input.href.replace(DEFAULT_BACKEND_URL, configuredBackendUrl)),
      init
    );
  }

  return originalFetch(input, init);
};
