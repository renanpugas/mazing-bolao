import { useMutation, useQuery } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";

export const usePredictionsListQuery = (poolId: string | null) =>
  useQuery({
    ...orpc.predictions.list.queryOptions({ input: { poolId: poolId ?? "" } }),
    enabled: !!poolId,
  });

export const useCreatePredictionMutation = () => useMutation(orpc.predictions.create.mutationOptions());

export const useUpdatePredictionMutation = () => useMutation(orpc.predictions.update.mutationOptions());
