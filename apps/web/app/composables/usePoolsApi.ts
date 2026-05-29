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
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: $orpc.pools.list.queryOptions().queryKey,
        });
      },
    }),
  );
};
