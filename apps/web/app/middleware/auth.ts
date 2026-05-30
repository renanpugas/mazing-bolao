export default defineNuxtRouteMiddleware(async (to, from) => {
  if (import.meta.server) return;

  const { useSession } = useAuthApi();
  const session = useSession();

  if (session.value.isPending) {
    return;
  }

  if (!session.value.data) {
    return navigateTo("/login");
  }
});
