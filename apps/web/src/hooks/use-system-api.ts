import { useQuery } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";

export const useHealthCheckQuery = () => useQuery(orpc.healthCheck.queryOptions());
