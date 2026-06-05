import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";

export const usePoolsListQuery = (options?: { enabled?: boolean }) =>
  useQuery({
    ...orpc.pools.list.queryOptions(),
    enabled: options?.enabled ?? true,
  });

export const useCreatePoolMutation = () => {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.pools.create.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: orpc.pools.list.queryOptions().queryKey });
      },
    }),
  );
};

export const useJoinPoolMutation = () => {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.pools.join.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: orpc.pools.list.queryOptions().queryKey });
      },
    }),
  );
};
