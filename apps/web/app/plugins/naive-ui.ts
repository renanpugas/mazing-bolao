import { create, darkTheme } from 'naive-ui';

export default defineNuxtPlugin((nuxtApp) => {
  const naive = create({});

  nuxtApp.vueApp.use(naive);

  return {
    provide: {
      naiveDarkTheme: darkTheme,
    },
  };
});
