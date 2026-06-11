import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";

export const useUsersListQuery = (options?: { enabled?: boolean }) =>
  useQuery({
    ...orpc.users.list.queryOptions(),
    enabled: options?.enabled ?? true,
  });

export const usePasswordAuthorizationsListQuery = (options?: { enabled?: boolean }) =>
  useQuery({
    ...orpc.users.listPasswordAuthorizations.queryOptions(),
    enabled: options?.enabled ?? true,
  });

export const useMakeUserAdminMutation = () => {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.users.makeAdmin.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: orpc.users.list.queryOptions().queryKey });
        void queryClient.invalidateQueries({ queryKey: orpc.session.get.queryOptions().queryKey });
      },
    }),
  );
};

export const useCreatePasswordAuthorizationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.users.createPasswordAuthorization.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: orpc.users.listPasswordAuthorizations.queryOptions().queryKey });
      },
    }),
  );
};

export const useRevokePasswordAuthorizationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.users.revokePasswordAuthorization.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: orpc.users.listPasswordAuthorizations.queryOptions().queryKey });
      },
    }),
  );
};

export const useRemoveUserAdminMutation = () => {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.users.removeAdmin.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: orpc.users.list.queryOptions().queryKey });
        void queryClient.invalidateQueries({ queryKey: orpc.session.get.queryOptions().queryKey });
      },
    }),
  );
};
