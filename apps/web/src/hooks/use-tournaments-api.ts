import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";

export const useTournamentsListQuery = () => useQuery(orpc.tournaments.list.queryOptions());

export const useSyncWorldCupMutation = () => {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.worldCup.sync.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: orpc.tournaments.list.queryOptions().queryKey });
      },
    }),
  );
};
