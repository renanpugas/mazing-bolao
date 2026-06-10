declare global {
  interface Window {
    __MAZING_BOLAO_ENV__?: {
      VITE_SERVER_URL?: string;
    };
  }
}

const runtimeServerUrl = typeof window !== "undefined" ? window.__MAZING_BOLAO_ENV__?.VITE_SERVER_URL : undefined;

export const serverUrl = runtimeServerUrl ?? import.meta.env.VITE_SERVER_URL ?? (import.meta.env.DEV ? "http://localhost:3009" : "");
