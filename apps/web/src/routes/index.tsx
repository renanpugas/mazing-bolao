import { createFileRoute, Link } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { PredictionMatchCard } from "@/components/predictions/prediction-match-card";
import type { Jogo, Palpite, PalpiteUpdate, PredictionSaveStatus } from "@/components/predictions/types";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePoolScoringRankingQuery } from "@/hooks/use-pool-scoring-api";
import { usePoolsListQuery } from "@/hooks/use-pools-api";
import { useCreatePredictionMutation, usePredictionsListQuery, useUpdatePredictionMutation } from "@/hooks/use-predictions-api";
import { useSessionQuery } from "@/hooks/use-session-api";
import { formatTeamNamePtBr } from "@/lib/team-names";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: HomePage });

const stageLabels: Record<string, string> = {
  group: "Fase de grupos",
  r32: "16 avos",
  r16: "Oitavas",
  qf: "Quartas",
  sf: "Semifinal",
  third: "3º lugar",
  final: "Final",
};

function getStageLabel(stage: string | null) {
  return stage ? stageLabels[stage] ?? stage.toUpperCase() : "Fase";
}

function hasCompletePrediction(palpite?: Palpite) {
  return palpite?.golsMandante !== null && palpite?.golsMandante !== undefined && palpite?.golsVisitante !== null && palpite?.golsVisitante !== undefined;
}

function getStatus(jogo: Pick<Jogo, "bloqueado" | "encerrado">, palpite?: Palpite): Pick<Jogo, "status" | "statusLabel"> {
  const hasPrediction = hasCompletePrediction(palpite);
  if (jogo.encerrado) return { status: "finished", statusLabel: "Encerrado" };
  if (jogo.bloqueado) return { status: "locked", statusLabel: hasPrediction ? "Bloqueado" : "Sem palpite" };
  if (!hasPrediction) return { status: "missing", statusLabel: "Sem palpite" };
  return { status: "saved", statusLabel: "Salvo" };
}

function HomePage() {
  const poolsQuery = usePoolsListQuery();
  const sessionQuery = useSessionQuery();
  const pools = poolsQuery.data ?? [];
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const predictionsQuery = usePredictionsListQuery(selectedPoolId);
  const rankingQuery = usePoolScoringRankingQuery(selectedPoolId);
  const createPredictionMutation = useCreatePredictionMutation();
  const updatePredictionMutation = useUpdatePredictionMutation();
  const savingIdsRef = useRef(new Set<string>());
  const [savedPredictions, setSavedPredictions] = useState<Record<string, Palpite>>({});
  const [localPredictions, setLocalPredictions] = useState<Record<string, Palpite>>({});
  const [changedPredictionIds, setChangedPredictionIds] = useState<Set<string>>(new Set());
  const [saveStatuses, setSaveStatuses] = useState<Record<string, PredictionSaveStatus>>({});
  const [requestError, setRequestError] = useState<string | null>(null);

  const selectedPool = pools.find((pool) => pool.id === selectedPoolId);

  useEffect(() => {
    if (!selectedPoolId && pools[0]) setSelectedPoolId(pools[0].id);
  }, [selectedPoolId, pools]);

  useEffect(() => {
    const nextPredictions = (predictionsQuery.data ?? []).reduce<Record<string, Palpite>>((acc, item) => {
      acc[item.match.id] = { id: item.id, golsMandante: item.homeGoals, golsVisitante: item.awayGoals };
      return acc;
    }, {});
    setSavedPredictions(nextPredictions);
    setLocalPredictions(nextPredictions);
    setChangedPredictionIds(new Set());
    setSaveStatuses({});
    savingIdsRef.current.clear();
  }, [predictionsQuery.data]);

  const matches = useMemo<Jogo[]>(() => {
    const now = new Date();

    return (predictionsQuery.data ?? []).map((item) => {
      const startsAt = new Date(item.match.startsAt);
      const savedPrediction = savedPredictions[item.match.id] ?? { id: item.id, golsMandante: item.homeGoals, golsVisitante: item.awayGoals };
      const stageLabel = getStageLabel(item.match.stage);
      const rodada = item.match.stage === "group" ? `Grupo ${item.match.groupName ?? ""} · Rodada ${item.match.matchday ?? ""}` : `${stageLabel} · Jogo ${item.match.matchday ?? ""}`;
      const base = { bloqueado: startsAt <= now, encerrado: !!item.match.finished };
      const status = getStatus(base, savedPrediction);

      return {
        id: item.match.id,
        rodada,
        stage: item.match.stage,
        stageLabel,
        groupName: item.match.groupName,
        matchday: item.match.matchday,
        horario: startsAt.toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" }),
        startsAt,
        estadio: item.match.stadiumName,
        cidade: item.match.stadiumCity,
        mandante: formatTeamNamePtBr(item.match.homeTeamLabel ?? item.match.homeTeam),
        visitante: formatTeamNamePtBr(item.match.awayTeamLabel ?? item.match.awayTeam),
        mandanteEmoji: item.match.homeTeamEmoji,
        visitanteEmoji: item.match.awayTeamEmoji,
        golsMandanteResultado: item.match.homeScore,
        golsVisitanteResultado: item.match.awayScore,
        oddsMandante: item.match.oddsHomeTeam,
        oddsEmpate: item.match.oddsDraw,
        oddsVisitante: item.match.oddsAwayTeam,
        ...base,
        ...status,
        pontuacao: item.match.scoring
          ? {
              placarExato: item.match.scoring.exactScorePoints,
              resultado: item.match.scoring.outcomePoints,
              jogoBrasil: item.match.scoring.isBrazilMatch,
              multiplicadorBrasil: item.match.scoring.brazilMultiplier,
            }
          : null,
      };
    });
  }, [predictionsQuery.data, savedPredictions]);

  useEffect(() => {
    if (!selectedPoolId || !changedPredictionIds.size) return;

    const timeout = window.setTimeout(() => {
      for (const matchId of changedPredictionIds) {
        const match = matches.find((item) => item.id === matchId);
        const prediction = localPredictions[matchId];
        if (!match || match.bloqueado || match.encerrado || !hasCompletePrediction(prediction) || savingIdsRef.current.has(matchId)) continue;
        const completePrediction = prediction as Palpite & { golsMandante: number; golsVisitante: number };

        savingIdsRef.current.add(matchId);
        setSaveStatuses((current) => ({ ...current, [matchId]: "saving" }));

        const save = completePrediction.id
          ? updatePredictionMutation.mutateAsync({ id: completePrediction.id, homeGoals: completePrediction.golsMandante, awayGoals: completePrediction.golsVisitante })
          : createPredictionMutation.mutateAsync({ poolId: selectedPoolId, matchId, homeGoals: completePrediction.golsMandante, awayGoals: completePrediction.golsVisitante });

        void save
          .then((result) => {
            const nextPrediction = { ...completePrediction, id: result?.id ?? completePrediction.id ?? null };
            setLocalPredictions((current) => ({ ...current, [matchId]: { ...(current[matchId] ?? completePrediction), id: nextPrediction.id } }));
            setSavedPredictions((current) => ({ ...current, [matchId]: nextPrediction }));
            setChangedPredictionIds((current) => {
              const next = new Set(current);
              next.delete(matchId);
              return next;
            });
            setSaveStatuses((current) => ({ ...current, [matchId]: "saved" }));
          })
          .catch((error) => {
            setRequestError(error instanceof Error ? error.message : "Erro ao salvar palpite automaticamente.");
            setSaveStatuses((current) => ({ ...current, [matchId]: "error" }));
          })
          .finally(() => {
            savingIdsRef.current.delete(matchId);
          });
      }
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [changedPredictionIds, createPredictionMutation, localPredictions, matches, selectedPoolId, updatePredictionMutation]);

  const currentUserId = sessionQuery.data?.user?.id;
  const ranking = rankingQuery.data ?? [];
  const userRankingIndex = ranking.findIndex((entry) => entry.userId === currentUserId);
  const userScore = userRankingIndex >= 0 ? ranking[userRankingIndex] : null;
  const openPendingMatches = matches.filter((match) => !match.encerrado && match.startsAt > new Date() && !hasCompletePrediction(savedPredictions[match.id]));
  const completedPredictions = matches.filter((match) => hasCompletePrediction(savedPredictions[match.id])).length;
  const loadingDashboard = poolsQuery.status === "pending" || sessionQuery.status === "pending" || (!!selectedPoolId && (predictionsQuery.status === "pending" || rankingQuery.status === "pending"));

  const updatePrediction = ({ jogoId, lado, gols }: PalpiteUpdate) => {
    setLocalPredictions((current) => {
      const currentPrediction = current[jogoId] ?? { id: null, golsMandante: null, golsVisitante: null };
      return {
        ...current,
        [jogoId]: {
          ...currentPrediction,
          golsMandante: lado === "mandante" ? gols : currentPrediction.golsMandante,
          golsVisitante: lado === "visitante" ? gols : currentPrediction.golsVisitante,
        },
      };
    });
    setChangedPredictionIds((current) => new Set(current).add(jogoId));
    setSaveStatuses((current) => ({ ...current, [jogoId]: "dirty" }));
    setRequestError(null);
  };

  const selectPool = (poolId: string) => {
    setSelectedPoolId(poolId);
    setRequestError(null);
  };

  return (
    <PageShell wide className="space-y-6">
      <PageHeader title="Meu bolão" description={selectedPool ? `${selectedPool.name} · ${openPendingMatches.length} palpite(s) pendente(s)` : "Acompanhe seus pontos e complete os palpites abertos."} />

      {requestError ? <Alert variant="destructive"><AlertTitle>Não foi possível salvar</AlertTitle><AlertDescription>{requestError}</AlertDescription></Alert> : null}
      {loadingDashboard ? <Alert variant="info"><AlertTitle>Carregando painel</AlertTitle><AlertDescription>Buscando bolões, ranking e partidas disponíveis.</AlertDescription></Alert> : null}
      {poolsQuery.status === "error" ? <Alert variant="destructive"><AlertTitle>Erro ao carregar bolões</AlertTitle><AlertDescription>{poolsQuery.error?.message || "Não foi possível carregar seus bolões."}</AlertDescription></Alert> : null}
      {predictionsQuery.status === "error" ? <Alert variant="destructive"><AlertTitle>Erro ao carregar partidas</AlertTitle><AlertDescription>{predictionsQuery.error?.message || "Não foi possível carregar os jogos do bolão."}</AlertDescription></Alert> : null}
      {rankingQuery.status === "error" ? <Alert variant="destructive"><AlertTitle>Erro ao carregar ranking</AlertTitle><AlertDescription>{rankingQuery.error?.message || "Não foi possível carregar sua pontuação."}</AlertDescription></Alert> : null}

      {poolsQuery.status === "success" && !pools.length ? (
        <Card className="bg-card/80 backdrop-blur-sm">
          <CardHeader><CardTitle>Você ainda não está em um bolão</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Crie um bolão ou entre em um existente para começar a palpitar.</p>
            <div className="flex flex-wrap gap-2">
              <Link to="/pools/new" className={cn(buttonVariants({ variant: "default" }))}>Criar bolão</Link>
              <Link to="/pools" className={cn(buttonVariants({ variant: "outline" }))}>Entrar em bolão</Link>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {pools.length ? (
        <>
          <Card className="bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Bolão selecionado</CardTitle>
              <p className="text-sm text-muted-foreground">{pools.length > 1 ? "Escolha qual bolão quer acompanhar na home." : "Este é o bolão usado no painel da home."}</p>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {pools.map((pool) => <Button key={pool.id} variant={pool.id === selectedPoolId ? "default" : "soft"} onClick={() => selectPool(pool.id)}>{pool.name}</Button>)}
            </CardContent>
          </Card>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <ScoreMetric label="Pontos" value={userScore?.points ?? 0} highlight />
            <ScoreMetric label="Posição" value={userScore ? `${userRankingIndex + 1}º` : "-"} />
            <ScoreMetric label="Placares exatos" value={userScore?.exactScores ?? 0} />
            <ScoreMetric label="Resultados corretos" value={userScore?.correctOutcomes ?? 0} />
            <ScoreMetric label="Perguntas" value={`${userScore?.questionPoints ?? 0} pts · ${userScore?.correctQuestions ?? 0} acerto(s)`} />
          </section>

          {!userScore && rankingQuery.status === "success" ? <Alert variant="warning"><AlertTitle>Pontuação indisponível</AlertTitle><AlertDescription>Sua linha ainda não apareceu no ranking deste bolão. Mostrando valores zerados por enquanto.</AlertDescription></Alert> : null}

          <Card className="bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>Palpites pendentes</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">Jogos abertos que ainda não têm placar completo.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={openPendingMatches.length ? "warning" : "success"}>{openPendingMatches.length} pendente(s)</Badge>
                  <Badge variant="outline">{completedPredictions}/{matches.length} preenchidos</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {openPendingMatches.length ? (
                <div className="grid gap-4 xl:grid-cols-2">
                  {openPendingMatches.map((match) => (
                    <PredictionMatchCard key={match.id} jogo={match} palpite={localPredictions[match.id] ?? { golsMandante: null, golsVisitante: null }} onUpdate={updatePrediction} saveStatus={saveStatuses[match.id] ?? "idle"} compact />
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background/70 p-4">
                  <div>
                    <p className="font-medium">Palpites em dia</p>
                    <p className="text-sm text-muted-foreground">Não há jogos abertos sem palpite completo neste bolão.</p>
                  </div>
                  <Trophy className="size-5 text-primary" />
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </PageShell>
  );
}

function ScoreMetric({ label, value, highlight = false }: { label: string; value: number | string; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-primary/40 bg-primary text-primary-foreground shadow-md" : "bg-card/80 backdrop-blur-sm"}>
      <CardContent className="p-4">
        <p className={highlight ? "text-sm text-primary-foreground/80" : "text-sm text-muted-foreground"}>{label}</p>
        <p className="mt-2 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
