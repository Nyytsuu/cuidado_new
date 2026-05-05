const DEFAULT_BACKEND_URL = "http://localhost:5000";

declare global {
  interface Window {
    CUIDADO_BACKEND_URL?: string;
  }
}

const queryBackendUrl = new URLSearchParams(window.location.search).get("apiBase");

const getConfiguredBackendUrl = () =>
  (
    window.CUIDADO_BACKEND_URL ||
    queryBackendUrl ||
    import.meta.env.VITE_API_BASE_URL ||
    DEFAULT_BACKEND_URL
  ).replace(/\/$/, "");

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
