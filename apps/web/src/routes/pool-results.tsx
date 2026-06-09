import { createFileRoute } from "@tanstack/react-router";

import { PoolResultsPage } from "@/components/pool-results-page";

export const Route = createFileRoute("/pool-results")({ component: PoolResultsRoute });

function PoolResultsRoute() {
  return <PoolResultsPage />;
}
