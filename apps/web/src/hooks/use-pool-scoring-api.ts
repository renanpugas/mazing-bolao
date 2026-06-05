import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";

export const usePoolScoringConfigQuery = (poolId: string | null) =>
  useQuery({
    ...orpc.poolScoring.getConfig.queryOptions({ input: { poolId: poolId ?? "" } }),
    enabled: !!poolId,
  });

export const usePoolScoringRankingQuery = (poolId: string | null) =>
  useQuery({
    ...orpc.poolScoring.ranking.queryOptions({ input: { poolId: poolId ?? "" } }),
    enabled: !!poolId,
  });

export const usePoolQuestionScoresQuery = (poolId: string | null) =>
  useQuery({
    ...orpc.poolScoring.listQuestionScores.queryOptions({ input: { poolId: poolId ?? "" } }),
    enabled: !!poolId,
  });

export const useUpdatePoolScoringConfigMutation = (poolId: string | null) => {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.poolScoring.updateConfig.mutationOptions({
      onSuccess: () => {
        if (!poolId) return;
        void queryClient.invalidateQueries({ queryKey: orpc.poolScoring.getConfig.queryOptions({ input: { poolId } }).queryKey });
        void queryClient.invalidateQueries({ queryKey: orpc.poolScoring.ranking.queryOptions({ input: { poolId } }).queryKey });
      },
    }),
  );
};

export const useUpdatePoolQuestionScoresMutation = (poolId: string | null) => {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.poolScoring.updateQuestionScores.mutationOptions({
      onSuccess: () => {
        if (!poolId) return;
        void queryClient.invalidateQueries({ queryKey: orpc.poolScoring.listQuestionScores.queryOptions({ input: { poolId } }).queryKey });
        void queryClient.invalidateQueries({ queryKey: orpc.poolScoring.ranking.queryOptions({ input: { poolId } }).queryKey });
      },
    }),
  );
};
