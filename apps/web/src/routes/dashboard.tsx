import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle } from "lucide-react";

import { PageHeader, PageShell } from "@/components/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSessionQuery } from "@/hooks/use-session-api";
import { orpc } from "@/lib/orpc";

export const Route = createFileRoute("/dashboard")({ component: DashboardPage });

function DashboardPage() {
  const session = useSessionQuery();
  const privateData = useQuery(orpc.privateData.queryOptions());

  return (
    <PageShell className="space-y-6">
      <PageHeader title="Dashboard" description={session.data?.user ? `Welcome back, ${session.data.user.name}!` : "Loading..."} />
      <Card>
        <CardHeader>
          <CardTitle>Private Data</CardTitle>
        </CardHeader>
        <CardContent>
          {privateData.status === "pending" ? <Skeleton className="h-6 w-48" /> : null}
          {privateData.status === "error" ? (
            <Alert variant="destructive">
              <AlertTitle>Error loading data</AlertTitle>
              <AlertDescription>{privateData.error?.message || "Failed to load private data"}</AlertDescription>
            </Alert>
          ) : null}
          {privateData.data ? (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              <span>{privateData.data.message}</span>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </PageShell>
  );
}
