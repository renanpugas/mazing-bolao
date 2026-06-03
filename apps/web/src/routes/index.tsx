import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle, Loader2, XCircle } from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useHealthCheckQuery } from "@/hooks/use-system-api";

const TITLE_TEXT = String.raw`
 ██████╗ ███████╗████████╗████████╗███████╗██████╗
 ██╔══██╗██╔════╝╚══██╔══╝╚══██╔══╝██╔════╝██╔══██╗
 ██████╔╝█████╗     ██║      ██║   █████╗  ██████╔╝
 ██╔══██╗██╔══╝     ██║      ██║   ██╔══╝  ██╔══██╗
 ██████╔╝███████╗   ██║      ██║   ███████╗██║  ██║
 ╚═════╝ ╚══════╝   ╚═╝      ╚═╝   ╚══════╝╚═╝  ╚═╝

 ████████╗    ███████╗████████╗ █████╗  ██████╗██╗  ██╗
 ╚══██╔══╝    ██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝
    ██║       ███████╗   ██║   ███████║██║     █████╔╝
    ██║       ╚════██║   ██║   ██╔══██║██║     ██╔═██╗
    ██║       ███████║   ██║   ██║  ██║╚██████╗██║  ██╗
    ╚═╝       ╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
`;

export const Route = createFileRoute("/")({ component: HomePage });

function HomePage() {
  const healthCheck = useHealthCheckQuery();
  const Icon = healthCheck.isLoading ? Loader2 : healthCheck.isSuccess ? CheckCircle : XCircle;

  return (
    <PageShell>
      <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-sm">{TITLE_TEXT}</pre>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>API Status</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2">
          <Icon className={healthCheck.isLoading ? "h-5 w-5 animate-spin text-muted-foreground" : healthCheck.isSuccess ? "h-5 w-5 text-emerald-600" : "h-5 w-5 text-destructive"} />
          <span className="text-sm">
            {healthCheck.isLoading ? "Checking..." : healthCheck.isSuccess ? `Connected (${healthCheck.data})` : healthCheck.isError ? `Error: ${healthCheck.error?.message || "Failed to connect"}` : "Idle"}
          </span>
        </CardContent>
      </Card>
    </PageShell>
  );
}
