import { useQuery } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";

export const useSessionQuery = () =>
  useQuery({
    ...orpc.session.get.queryOptions(),
    staleTime: 5 * 60_000,
  });
