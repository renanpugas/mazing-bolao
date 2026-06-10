declare global {
  interface Window {
    __MAZING_BOLAO_ENV__?: {
      VITE_SERVER_URL?: string;
    };
  }
}

const runtimeServerUrl = typeof window !== "undefined" ? window.__MAZING_BOLAO_ENV__?.VITE_SERVER_URL : undefined;

const configuredServerUrl = runtimeServerUrl?.trim() || import.meta.env.VITE_SERVER_URL?.trim();
const defaultServerUrl = import.meta.env.DEV ? "http://localhost:3009" : "/api";
const apiBaseUrl = (configuredServerUrl || defaultServerUrl).replace(/\/+$/, "");
const absoluteApiBaseUrl = apiBaseUrl.startsWith("/") && typeof window !== "undefined" ? `${window.location.origin}${apiBaseUrl}` : apiBaseUrl;

export const serverUrl = apiBaseUrl.replace(/\/api$/, "");
export const rpcUrl = `${absoluteApiBaseUrl}/rpc`;
