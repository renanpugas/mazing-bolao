import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { PageHeader, PageShell } from "@/components/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useJoinPoolMutation, usePoolsListQuery } from "@/hooks/use-pools-api";

export const Route = createFileRoute("/pools/")({ component: PoolsPage });

function PoolsPage() {
  const poolsQuery = usePoolsListQuery();
  const joinPoolMutation = useJoinPoolMutation();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const availablePools = poolsQuery.data ?? [];

  const joinPool = async (poolId: string, poolName: string) => {
    setSuccessMessage(null);
    setRequestError(null);
    try {
      await joinPoolMutation.mutateAsync({ poolId });
      setSuccessMessage(`Você entrou no bolão "${poolName}".`);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Erro ao entrar no bolão.");
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-transparent">
      <PageShell className="space-y-6">
        <PageHeader title="Available Pools" description="Veja os bolões disponíveis e entre nos que quiser participar." />
        {successMessage ? <Alert variant="success"><AlertTitle>Entrada confirmada</AlertTitle><AlertDescription>{successMessage}</AlertDescription></Alert> : null}
        {requestError ? <Alert variant="destructive"><AlertTitle>Não foi possível entrar</AlertTitle><AlertDescription>{requestError}</AlertDescription></Alert> : null}
        {poolsQuery.status === "pending" ? <Alert variant="info"><AlertTitle>Carregando bolões</AlertTitle><AlertDescription>Buscando bolões disponíveis...</AlertDescription></Alert> : null}
        {poolsQuery.status === "error" ? <Alert variant="destructive"><AlertTitle>Erro ao carregar bolões</AlertTitle><AlertDescription>{poolsQuery.error?.message || "Não foi possível carregar os bolões."}</AlertDescription></Alert> : null}
        {poolsQuery.status === "success" && availablePools.length ? (
          <Card className="bg-card/80 backdrop-blur-sm">
            <CardHeader><CardTitle>Bolões disponíveis</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {availablePools.map((pool) => (
                <div key={pool.id} className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium">{pool.name}</p>
                    <p className="text-sm text-muted-foreground">Criado em: {new Date(pool.createdAt).toLocaleString("pt-BR")}</p>
                  </div>
                  <Button onClick={() => void joinPool(pool.id, pool.name)} disabled={joinPoolMutation.isPending}>Entrar no bolão</Button>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
        {poolsQuery.status === "success" && !availablePools.length ? <Alert variant="warning"><AlertTitle>Nenhum bolão encontrado</AlertTitle><AlertDescription>Ainda não existem bolões disponíveis para entrada.</AlertDescription></Alert> : null}
      </PageShell>
    </div>
  );
}
