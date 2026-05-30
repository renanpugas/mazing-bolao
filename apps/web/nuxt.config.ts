import "@mazing-bolao/env/web";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "latest",
  devtools: { enabled: true },
  experimental: {
    payloadExtraction: "client",
  },
  build: {
    transpile: ["naive-ui", "vueuc", "date-fns", "seemly", "vooks", "@css-render/vue3-ssr"],
  },
  vite: {
    ssr: {
      noExternal: ["naive-ui", "vueuc", "seemly", "vooks"],
    },
  },
  modules: ["@nuxt/ui"],
  css: ["~/assets/css/main.css"],
  devServer: {
    port: 5173,
  },
  runtimeConfig: {
    public: {
      serverUrl: process.env.NUXT_PUBLIC_SERVER_URL ?? "",
    },
  },
});
