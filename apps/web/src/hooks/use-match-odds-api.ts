import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";

export const useMatchOddsListQuery = (poolId: string | null) =>
  useQuery({
    ...orpc.matchOdds.listForPool.queryOptions({ input: { poolId: poolId ?? "" } }),
    enabled: !!poolId,
  });

export const useUpdateMatchOddsMutation = (poolId: string | null) => {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.matchOdds.updateForMatch.mutationOptions({
      onSuccess: () => {
        if (!poolId) return;
        void queryClient.invalidateQueries({
          queryKey: orpc.matchOdds.listForPool.queryOptions({ input: { poolId } }).queryKey,
        });
      },
    }),
  );
};

export const useSyncMissingMatchOddsIdsMutation = (poolId: string | null) => {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.matchOdds.syncMissingMatchIds.mutationOptions({
      onSuccess: () => {
        if (!poolId) return;
        void queryClient.invalidateQueries({
          queryKey: orpc.matchOdds.listForPool.queryOptions({ input: { poolId } }).queryKey,
        });
      },
    }),
  );
};
