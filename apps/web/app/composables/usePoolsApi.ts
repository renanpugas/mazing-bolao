import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

export const usePoolsListQuery = () => {
  const { $orpc } = useNuxtApp();

  return useQuery($orpc.pools.list.queryOptions());
};

export const useCreatePoolMutation = () => {
  const { $orpc } = useNuxtApp();
  const queryClient = useQueryClient();

  return useMutation(
    $orpc.pools.create.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: $orpc.pools.list.queryOptions().queryKey,
        });
      },
    }),
  );
};

export const useJoinPoolMutation = () => {
  const { $orpc } = useNuxtApp();
  const queryClient = useQueryClient();

  return useMutation(
    $orpc.pools.join.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: $orpc.pools.list.queryOptions().queryKey,
        });
      },
    }),
  );
};
