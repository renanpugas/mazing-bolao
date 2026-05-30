import { useQuery } from "@tanstack/vue-query";

export const useHealthCheckQuery = () => {
  const { $orpc } = useNuxtApp();

  return useQuery($orpc.healthCheck.queryOptions());
};
