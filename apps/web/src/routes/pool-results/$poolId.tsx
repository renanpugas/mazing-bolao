import { createFileRoute } from "@tanstack/react-router";

import { PoolResultsPage } from "@/components/pool-results-page";

export const Route = createFileRoute("/pool-results/$poolId")({ component: PoolResultsByPoolRoute });

function PoolResultsByPoolRoute() {
  const { poolId } = Route.useParams();

  return <PoolResultsPage initialPoolId={poolId} />;
}
