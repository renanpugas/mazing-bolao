export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return;

  // Keep login page public so unauthenticated users can access it.
  if (to.path === "/login") {
    return;
  }

  const { $authClient } = useNuxtApp();
  const session = $authClient.useSession();

  if (session.value.isPending) {
    return;
  }

  if (!session.value.data) {
    return navigateTo("/login");
  }
});
