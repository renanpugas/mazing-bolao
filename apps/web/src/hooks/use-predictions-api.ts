import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";

export const usePredictionsListQuery = (poolId: string | null) =>
  useQuery({
    ...orpc.predictions.list.queryOptions({ input: { poolId: poolId ?? "" } }),
    enabled: !!poolId,
  });

export const usePredictionMatchComparisonQuery = (poolId: string | null, matchId: string | null) =>
  useQuery({
    ...orpc.predictions.matchComparison.queryOptions({ input: { poolId: poolId ?? "", matchId: matchId ?? "" } }),
    enabled: !!poolId && !!matchId,
  });

export const useCreatePredictionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.predictions.create.mutationOptions({
      onSuccess: (_data, variables) => {
        void queryClient.invalidateQueries({ queryKey: orpc.predictions.list.queryOptions({ input: { poolId: variables.poolId } }).queryKey });
      },
    }),
  );
};

export const useUpdatePredictionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.predictions.update.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: orpc.predictions.list.key({ type: "query" }) });
      },
    }),
  );
};
