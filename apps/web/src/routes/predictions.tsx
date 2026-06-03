import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { PredictionMatchList } from "@/components/predictions/prediction-match-list";
import { PredictionSummary } from "@/components/predictions/prediction-summary";
import type { Jogo, Palpite, PalpiteUpdate } from "@/components/predictions/types";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePoolsListQuery } from "@/hooks/use-pools-api";
import { useCreatePredictionMutation, usePredictionsListQuery, useUpdatePredictionMutation } from "@/hooks/use-predictions-api";
import { formatTeamNamePtBr } from "@/lib/team-names";

export const Route = createFileRoute("/predictions")({ component: PredictionsPage });

function PredictionsPage() {
  const poolsQuery = usePoolsListQuery();
  const boloes = poolsQuery.data ?? [];
  const [bolaoSelecionadoId, setBolaoSelecionadoId] = useState<string | null>(null);
  const predictionsQuery = usePredictionsListQuery(bolaoSelecionadoId);
  const createPredictionMutation = useCreatePredictionMutation();
  const updatePredictionMutation = useUpdatePredictionMutation();
  const [palpitesLocais, setPalpitesLocais] = useState<Record<string, Palpite>>({});
  const [palpitesAlterados, setPalpitesAlterados] = useState<Set<string>>(new Set());
  const [mensagemEnvio, setMensagemEnvio] = useState("");
  const [requestError, setRequestError] = useState<string | null>(null);
  const salvandoPalpites = createPredictionMutation.isPending || updatePredictionMutation.isPending;

  useEffect(() => {
    if (!bolaoSelecionadoId && boloes[0]) setBolaoSelecionadoId(boloes[0].id);
  }, [bolaoSelecionadoId, boloes]);

  useEffect(() => {
    const nextPalpites = (predictionsQuery.data ?? []).reduce<Record<string, Palpite>>((acc, item) => {
      acc[item.match.id] = { id: item.id, golsMandante: item.homeGoals, golsVisitante: item.awayGoals };
      return acc;
    }, {});
    setPalpitesLocais(nextPalpites);
    setPalpitesAlterados(new Set());
  }, [predictionsQuery.data]);

  const jogos: Jogo[] = (predictionsQuery.data ?? []).map((item) => {
    const startsAt = new Date(item.match.startsAt);
    return {
      id: item.match.id,
      rodada: item.match.stage === "group" ? `Grupo ${item.match.groupName ?? ""} · Rodada ${item.match.matchday ?? ""}` : `${(item.match.groupName ?? item.match.stage ?? "Fase").toUpperCase()} · Jogo ${item.match.matchday ?? ""}`,
      horario: startsAt.toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" }),
      estadio: item.match.stadiumName,
      cidade: item.match.stadiumCity,
      mandante: formatTeamNamePtBr(item.match.homeTeamLabel ?? item.match.homeTeam),
      visitante: formatTeamNamePtBr(item.match.awayTeamLabel ?? item.match.awayTeam),
      mandanteEmoji: item.match.homeTeamEmoji,
      visitanteEmoji: item.match.awayTeamEmoji,
      encerrado: !!item.match.finished,
      bloqueado: startsAt <= new Date(),
    };
  });
  const palpitesPreenchidos = jogos.filter((jogo) => {
    const palpite = palpitesLocais[jogo.id];
    return palpite?.golsMandante !== null && palpite?.golsVisitante !== null;
  }).length;

  const atualizarPalpite = ({ jogoId, lado, gols }: PalpiteUpdate) => {
    setPalpitesLocais((current) => {
      const atual = current[jogoId] ?? { id: null, golsMandante: null, golsVisitante: null };
      return { ...current, [jogoId]: { ...atual, golsMandante: lado === "mandante" ? gols : atual.golsMandante, golsVisitante: lado === "visitante" ? gols : atual.golsVisitante } };
    });
    setPalpitesAlterados((current) => new Set(current).add(jogoId));
  };

  const selecionarBolao = (bolaoId: string) => {
    setBolaoSelecionadoId(bolaoId);
    setMensagemEnvio("");
    setRequestError(null);
  };

  const enviarPalpites = async () => {
    if (!bolaoSelecionadoId) return;
    setMensagemEnvio("");
    setRequestError(null);
    try {
      const mutations = jogos.flatMap((jogo) => {
        const palpite = palpitesLocais[jogo.id];
        if (!palpitesAlterados.has(jogo.id)) return [];
        if (!palpite || palpite.golsMandante === null || palpite.golsVisitante === null || jogo.bloqueado) return [];
        if (palpite.id) return updatePredictionMutation.mutateAsync({ id: palpite.id, homeGoals: palpite.golsMandante, awayGoals: palpite.golsVisitante });
        return createPredictionMutation.mutateAsync({ poolId: bolaoSelecionadoId, matchId: jogo.id, homeGoals: palpite.golsMandante, awayGoals: palpite.golsVisitante });
      });
      await Promise.all(mutations);
      await predictionsQuery.refetch();
      setMensagemEnvio(`Você salvou ${mutations.length} palpite(s) alterado(s) para o bolão selecionado.`);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Erro ao salvar palpites.");
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-transparent">
      <PageShell className="space-y-6">
        <PageHeader title="Palpites" description="Escolha os placares dos jogos da Copa do Mundo 2026 no bolão selecionado." />
        {requestError ? <Alert variant="destructive"><AlertTitle>Não foi possível salvar</AlertTitle><AlertDescription>{requestError}</AlertDescription></Alert> : null}
        <Card className="bg-card/80 backdrop-blur-sm"><CardContent className="space-y-3 pt-6"><p className="text-sm font-medium">Selecione o bolao</p><div className="flex flex-wrap gap-2">{boloes.map((bolao) => <Button key={bolao.id} variant={bolao.id === bolaoSelecionadoId ? "default" : "soft"} onClick={() => selecionarBolao(bolao.id)}>{bolao.name}</Button>)}</div></CardContent></Card>
        {poolsQuery.status === "pending" || predictionsQuery.status === "pending" ? <Alert variant="info"><AlertTitle>Carregando palpites</AlertTitle><AlertDescription>Buscando bolões, partidas e palpites salvos.</AlertDescription></Alert> : null}
        {predictionsQuery.status === "error" ? <Alert variant="destructive"><AlertTitle>Erro ao carregar partidas</AlertTitle><AlertDescription>{predictionsQuery.error?.message || "Não foi possível carregar os dados."}</AlertDescription></Alert> : null}
        {predictionsQuery.status !== "pending" && !jogos.length ? <Alert variant="warning"><AlertTitle>Nenhuma partida importada</AlertTitle><AlertDescription>Importe a Copa do Mundo 2026 e crie um bolão ligado a esse torneio antes de registrar palpites.</AlertDescription></Alert> : null}
        {jogos.length ? <PredictionSummary totalJogos={jogos.length} palpitesPreenchidos={palpitesPreenchidos} /> : null}
        {jogos.length ? <PredictionMatchList jogos={jogos} palpites={palpitesLocais} onUpdate={atualizarPalpite} /> : null}
        <Card className="bg-card/80 backdrop-blur-sm"><CardContent className="pt-6"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Você pode enviar quantos palpites quiser.</p><Button disabled={!jogos.length || !palpitesAlterados.size || salvandoPalpites} onClick={() => void enviarPalpites()}>Salvar palpites</Button></div>{mensagemEnvio ? <Alert className="mt-4" variant="success"><AlertDescription>{mensagemEnvio}</AlertDescription></Alert> : null}</CardContent></Card>
      </PageShell>
    </div>
  );
}
