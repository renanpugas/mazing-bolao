import { useQuery } from "@tanstack/vue-query";

export const useSessionQuery = () => {
  const { $orpc } = useNuxtApp();

  return useQuery($orpc.session.get.queryOptions());
};
