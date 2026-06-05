import { createFileRoute } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PageHeader, PageShell } from "@/components/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useMatchOddsListQuery,
  useSyncMissingMatchOddsIdsMutation,
  useUpdateMatchOddsMutation,
} from "@/hooks/use-match-odds-api";
import { usePoolsListQuery } from "@/hooks/use-pools-api";
import { useSessionQuery } from "@/hooks/use-session-api";

export const Route = createFileRoute("/match-odds")({ component: MatchOddsPage });

function formatDate(value: string | Date) {
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatOdd(value: number | null | undefined) {
  return typeof value === "number" ? value.toFixed(2) : "-";
}

function MatchOddsPage() {
  const sessionQuery = useSessionQuery();
  const isAdmin = !!sessionQuery.data?.user.isAdmin;
  const poolsQuery = usePoolsListQuery({ enabled: isAdmin });
  const manageablePools = useMemo(() => (isAdmin ? (poolsQuery.data ?? []) : []), [isAdmin, poolsQuery.data]);
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const [updatingMatchId, setUpdatingMatchId] = useState<string | null>(null);
  const [successMatchId, setSuccessMatchId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ matchId: string; message: string } | null>(null);
  const [syncResult, setSyncResult] = useState<{
    updatedCount: number;
    unmatchedCount: number;
    skippedExistingIdCount: number;
  } | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const oddsQuery = useMatchOddsListQuery(selectedPoolId);
  const updateOddsMutation = useUpdateMatchOddsMutation(selectedPoolId);
  const syncMissingIdsMutation = useSyncMissingMatchOddsIdsMutation(selectedPoolId);

  useEffect(() => {
    if (!selectedPoolId && manageablePools[0]) setSelectedPoolId(manageablePools[0].id);
  }, [manageablePools, selectedPoolId]);

  useEffect(() => {
    if (selectedPoolId && manageablePools.length && !manageablePools.some((pool) => pool.id === selectedPoolId)) {
      setSelectedPoolId(manageablePools[0]?.id ?? null);
    }
  }, [manageablePools, selectedPoolId]);

  const updateOdds = async (matchId: string) => {
    if (!selectedPoolId) return;
    setUpdatingMatchId(matchId);
    setSuccessMatchId(null);
    setRowError(null);
    try {
      await updateOddsMutation.mutateAsync({ poolId: selectedPoolId, matchId });
      setSuccessMatchId(matchId);
      await oddsQuery.refetch();
    } catch (error) {
      setRowError({ matchId, message: error instanceof Error ? error.message : "Erro ao atualizar odds." });
    } finally {
      setUpdatingMatchId(null);
    }
  };

  const syncMissingIds = async () => {
    if (!selectedPoolId) return;
    setSyncResult(null);
    setSyncError(null);
    setSuccessMatchId(null);
    setRowError(null);
    try {
      const result = await syncMissingIdsMutation.mutateAsync({ poolId: selectedPoolId });
      setSyncResult(result);
      await oddsQuery.refetch();
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Erro ao sincronizar partidas sem id.");
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-transparent">
      <PageShell className="space-y-6">
        <PageHeader title="Odds das Partidas" />

        {sessionQuery.status === "pending" ? (
          <Alert variant="info">
            <AlertTitle>Verificando permissões</AlertTitle>
            <AlertDescription>Carregando sua sessão.</AlertDescription>
          </Alert>
        ) : null}

        {sessionQuery.status === "success" && !isAdmin ? (
          <Alert variant="warning">
            <AlertTitle>Acesso restrito</AlertTitle>
            <AlertDescription>Somente administradores podem acessar a tela de odds.</AlertDescription>
          </Alert>
        ) : null}

        {poolsQuery.status === "pending" && isAdmin ? (
          <Alert variant="info">
            <AlertTitle>Carregando bolões</AlertTitle>
            <AlertDescription>Buscando seus bolões cadastrados.</AlertDescription>
          </Alert>
        ) : null}

        {poolsQuery.status === "error" && isAdmin ? (
          <Alert variant="destructive">
            <AlertTitle>Erro ao carregar bolões</AlertTitle>
            <AlertDescription>{poolsQuery.error?.message || "Não foi possível carregar os bolões."}</AlertDescription>
          </Alert>
        ) : null}

        {poolsQuery.status === "success" && isAdmin && !manageablePools.length ? (
          <Alert variant="warning">
            <AlertTitle>Nenhum bolão disponível</AlertTitle>
            <AlertDescription>Você não tem bolões para administrar.</AlertDescription>
          </Alert>
        ) : null}

        {manageablePools.length ? (
          <Card className="bg-card/80 backdrop-blur-sm">
            <CardContent className="space-y-3 pt-6">
              <p className="text-sm font-medium">Bolão</p>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap gap-2">
                  {manageablePools.map((pool) => (
                    <Button
                      key={pool.id}
                      variant={pool.id === selectedPoolId ? "default" : "soft"}
                      onClick={() => {
                        setSelectedPoolId(pool.id);
                        setSuccessMatchId(null);
                        setRowError(null);
                        setSyncResult(null);
                        setSyncError(null);
                      }}
                    >
                      {pool.name}
                    </Button>
                  ))}
                </div>
                <Button
                  className="gap-2 md:self-start"
                  variant="secondary"
                  disabled={!selectedPoolId || syncMissingIdsMutation.isPending}
                  onClick={() => void syncMissingIds()}
                >
                  <RefreshCw className={`size-4 ${syncMissingIdsMutation.isPending ? "animate-spin" : ""}`} />
                  {syncMissingIdsMutation.isPending ? "Sincronizando" : "Sincronizar partidas sem id"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {syncResult ? (
          <Alert variant="success">
            <AlertTitle>Sincronização concluída</AlertTitle>
            <AlertDescription>
              {syncResult.updatedCount} partida(s) atualizada(s), {syncResult.unmatchedCount} sem correspondência e{" "}
              {syncResult.skippedExistingIdCount} ignorada(s) por id já existente.
            </AlertDescription>
          </Alert>
        ) : null}

        {syncError ? (
          <Alert variant="destructive">
            <AlertTitle>Erro ao sincronizar partidas</AlertTitle>
            <AlertDescription>{syncError}</AlertDescription>
          </Alert>
        ) : null}

        {oddsQuery.status === "pending" && selectedPoolId ? (
          <Alert variant="info">
            <AlertTitle>Carregando partidas</AlertTitle>
            <AlertDescription>Buscando partidas e odds salvas.</AlertDescription>
          </Alert>
        ) : null}

        {oddsQuery.status === "error" ? (
          <Alert variant="destructive">
            <AlertTitle>Erro ao carregar partidas</AlertTitle>
            <AlertDescription>{oddsQuery.error?.message || "Não foi possível carregar as partidas."}</AlertDescription>
          </Alert>
        ) : null}

        {oddsQuery.status === "success" && !oddsQuery.data.length ? (
          <Alert variant="warning">
            <AlertTitle>Nenhuma partida</AlertTitle>
            <AlertDescription>O torneio desse bolão ainda não tem partidas cadastradas.</AlertDescription>
          </Alert>
        ) : null}

        {oddsQuery.data?.length ? (
          <Card className="bg-card/80 backdrop-blur-sm">
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Partida</TableHead>
                    <TableHead>Horário</TableHead>
                    <TableHead>Mandante</TableHead>
                    <TableHead>Empate</TableHead>
                    <TableHead>Visitante</TableHead>
                    <TableHead className="w-[170px]">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {oddsQuery.data.map((match) => {
                    const isUpdating = updatingMatchId === match.id;
                    const hasError = rowError?.matchId === match.id;
                    const updated = successMatchId === match.id;
                    return (
                      <TableRow key={match.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">
                              {match.homeTeamLabel ?? match.homeTeam} x {match.awayTeamLabel ?? match.awayTeam}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {[match.stage, match.groupName].filter(Boolean).join(" · ") || "Partida"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(match.startsAt)}</TableCell>
                        <TableCell>{formatOdd(match.oddsHomeTeam)}</TableCell>
                        <TableCell>{formatOdd(match.oddsDraw)}</TableCell>
                        <TableCell>{formatOdd(match.oddsAwayTeam)}</TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <Button
                              className="gap-2"
                              size="sm"
                              disabled={!match.oddsApiMatchId || isUpdating}
                              onClick={() => void updateOdds(match.id)}
                            >
                              <RefreshCw className={`size-4 ${isUpdating ? "animate-spin" : ""}`} />
                              {isUpdating ? "Atualizando" : match.oddsApiMatchId ? "Atualizar odds" : "(sem odd id)"}
                            </Button>
                            {updated ? <p className="text-xs text-emerald-600">Odds atualizadas.</p> : null}
                            {hasError ? <p className="text-xs text-destructive">{rowError.message}</p> : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}
      </PageShell>
    </div>
  );
}
