import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

export const usePoolsListQuery = () => {
  const { $orpc } = useNuxtApp();
  const session = useSessionQuery();

  return useQuery({
    ...$orpc.pools.list.queryOptions(),
    enabled: computed(() => !!session.data.value?.user),
  });
};

export const useCreatePoolMutation = () => {
  const { $orpc } = useNuxtApp();
  const queryClient = useQueryClient();

  return useMutation(
    $orpc.pools.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
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
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: $orpc.pools.list.queryOptions().queryKey,
        });
      },
    }),
  );
};
