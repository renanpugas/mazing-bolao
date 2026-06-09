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

export const useUpdatePoolMutation = () => {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.pools.update.mutationOptions({
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

export const usePoolParticipantsQuery = (poolId: string | null) =>
  useQuery({
    ...orpc.pools.participants.queryOptions({ input: { poolId: poolId ?? "" } }),
    enabled: !!poolId,
  });

export const useAddPoolParticipantMutation = (poolId: string | null) => {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.pools.addParticipant.mutationOptions({
      onSuccess: () => {
        if (!poolId) return;
        void queryClient.invalidateQueries({ queryKey: orpc.pools.participants.queryOptions({ input: { poolId } }).queryKey });
        void queryClient.invalidateQueries({ queryKey: orpc.poolScoring.ranking.queryOptions({ input: { poolId } }).queryKey });
      },
    }),
  );
};

export const useRemovePoolParticipantMutation = (poolId: string | null) => {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.pools.removeParticipant.mutationOptions({
      onSuccess: () => {
        if (!poolId) return;
        void queryClient.invalidateQueries({ queryKey: orpc.pools.participants.queryOptions({ input: { poolId } }).queryKey });
        void queryClient.invalidateQueries({ queryKey: orpc.poolScoring.ranking.queryOptions({ input: { poolId } }).queryKey });
      },
    }),
  );
};
