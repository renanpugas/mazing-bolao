import { useMutation, useQuery } from "@tanstack/vue-query";

export const usePredictionsListQuery = (poolId: Ref<string | null>) => {
  const { $orpc } = useNuxtApp();

  return useQuery({
    ...$orpc.predictions.list.queryOptions(
      computed(() => ({
        poolId: poolId.value ?? "",
      })),
    ),
    enabled: computed(() => !!poolId.value),
  });
};

export const useCreatePredictionMutation = () => {
  const { $orpc } = useNuxtApp();

  return useMutation($orpc.predictions.create.mutationOptions());
};

export const useUpdatePredictionMutation = () => {
  const { $orpc } = useNuxtApp();

  return useMutation($orpc.predictions.update.mutationOptions());
};
