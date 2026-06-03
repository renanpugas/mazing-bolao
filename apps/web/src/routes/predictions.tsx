import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { PredictionMatchList } from "@/components/predictions/prediction-match-list";
import { PredictionSummary } from "@/components/predictions/prediction-summary";
import type { Jogo, Palpite, PalpiteUpdate } from "@/components/predictions/types";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAnswerPoolQuestionMutation, usePoolQuestionsListQuery } from "@/hooks/use-pool-questions-api";
import { usePoolsListQuery } from "@/hooks/use-pools-api";
import { useCreatePredictionMutation, usePredictionsListQuery, useUpdatePredictionMutation } from "@/hooks/use-predictions-api";
import { formatTeamNamePtBr } from "@/lib/team-names";

export const Route = createFileRoute("/predictions")({ component: PredictionsPage });

function PredictionsPage() {
  const poolsQuery = usePoolsListQuery();
  const boloes = poolsQuery.data ?? [];
  const [bolaoSelecionadoId, setBolaoSelecionadoId] = useState<string | null>(null);
  const predictionsQuery = usePredictionsListQuery(bolaoSelecionadoId);
  const questionsQuery = usePoolQuestionsListQuery(bolaoSelecionadoId);
  const createPredictionMutation = useCreatePredictionMutation();
  const updatePredictionMutation = useUpdatePredictionMutation();
  const answerQuestionMutation = useAnswerPoolQuestionMutation(bolaoSelecionadoId);
  const [palpitesLocais, setPalpitesLocais] = useState<Record<string, Palpite>>({});
  const [palpitesAlterados, setPalpitesAlterados] = useState<Set<string>>(new Set());
  const [respostasLivres, setRespostasLivres] = useState<Record<string, string>>({});
  const [mensagemEnvio, setMensagemEnvio] = useState("");
  const [mensagemResposta, setMensagemResposta] = useState<string | null>(null);
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

  useEffect(() => {
    const nextRespostas = (questionsQuery.data ?? []).reduce<Record<string, string>>((acc, question) => {
      acc[question.id] = question.answer?.answer ?? "";
      return acc;
    }, {});
    setRespostasLivres(nextRespostas);
  }, [questionsQuery.data]);

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
  const perguntasLivresVisiveis = (questionsQuery.data ?? []).filter((question) => question.answer?.isCorrect === null || question.answer?.isCorrect === undefined);

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
    setMensagemResposta(null);
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

  const salvarRespostaLivre = async (questionId: string) => {
    setMensagemResposta(null);
    setRequestError(null);
    try {
      await answerQuestionMutation.mutateAsync({ questionId, answer: respostasLivres[questionId] ?? "" });
      await questionsQuery.refetch();
      setMensagemResposta("Resposta salva.");
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Erro ao salvar resposta.");
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-transparent">
      <PageShell className="space-y-6">
        <PageHeader title="Palpites" description="Escolha os placares dos jogos da Copa do Mundo 2026 no bolão selecionado." />
        {requestError ? <Alert variant="destructive"><AlertTitle>Não foi possível salvar</AlertTitle><AlertDescription>{requestError}</AlertDescription></Alert> : null}
        <Card className="bg-card/80 backdrop-blur-sm"><CardContent className="space-y-3 pt-6"><p className="text-sm font-medium">Selecione o bolao</p><div className="flex flex-wrap gap-2">{boloes.map((bolao) => <Button key={bolao.id} variant={bolao.id === bolaoSelecionadoId ? "default" : "soft"} onClick={() => selecionarBolao(bolao.id)}>{bolao.name}</Button>)}</div></CardContent></Card>
        {poolsQuery.status === "pending" || predictionsQuery.status === "pending" || questionsQuery.status === "pending" ? <Alert variant="info"><AlertTitle>Carregando palpites</AlertTitle><AlertDescription>Buscando bolões, partidas, perguntas e palpites salvos.</AlertDescription></Alert> : null}
        {predictionsQuery.status === "error" ? <Alert variant="destructive"><AlertTitle>Erro ao carregar partidas</AlertTitle><AlertDescription>{predictionsQuery.error?.message || "Não foi possível carregar os dados."}</AlertDescription></Alert> : null}
        {questionsQuery.status === "error" ? <Alert variant="destructive"><AlertTitle>Erro ao carregar perguntas</AlertTitle><AlertDescription>{questionsQuery.error?.message || "Não foi possível carregar as perguntas."}</AlertDescription></Alert> : null}
        {questionsQuery.status === "success" && perguntasLivresVisiveis.length ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">Perguntas livres</h2>
              <p className="text-sm text-muted-foreground">Responda as perguntas do bolão selecionado.</p>
            </div>
            {mensagemResposta ? <Alert variant="success"><AlertDescription>{mensagemResposta}</AlertDescription></Alert> : null}
            <div className="grid gap-4 md:grid-cols-2">
              {perguntasLivresVisiveis.map((question) => {
                const closesAt = new Date(question.closesAt);
                const closed = closesAt <= new Date();
                const savedAnswer = question.answer?.answer ?? "";
                const currentAnswer = respostasLivres[question.id] ?? "";
                const hasSavedAnswer = !!question.answer?.id;
                const answerChanged = currentAnswer.trim() !== savedAnswer.trim();
                const answerButtonText = hasSavedAnswer ? "Atualizar resposta" : "Salvar resposta";
                const answerButtonDisabled = closed || !currentAnswer.trim() || answerQuestionMutation.isPending || (hasSavedAnswer && !answerChanged);
                return (
                  <Card key={question.id} className="bg-card/80 backdrop-blur-sm">
                    <CardHeader className="space-y-3">
                      <CardTitle className="text-lg">{question.question}</CardTitle>
                      <p className="text-sm text-muted-foreground">Prazo: {closesAt.toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" })}</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={closed ? "secondary" : "default"}>{closed ? "Fechada" : "Aberta"}</Badge>
                        <Badge variant="outline">{question.points} ponto(s)</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Textarea
                        value={currentAnswer}
                        onChange={(event) => setRespostasLivres((current) => ({ ...current, [question.id]: event.target.value }))}
                        disabled={closed || answerQuestionMutation.isPending}
                        placeholder="Digite sua resposta"
                      />
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-muted-foreground">{closed ? "Prazo encerrado" : "Resposta livre até o prazo"}</p>
                        <Button disabled={answerButtonDisabled} onClick={() => void salvarRespostaLivre(question.id)}>{answerButtonText}</Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : null}
        {predictionsQuery.status !== "pending" && !jogos.length ? <Alert variant="warning"><AlertTitle>Nenhuma partida importada</AlertTitle><AlertDescription>Importe a Copa do Mundo 2026 e crie um bolão ligado a esse torneio antes de registrar palpites.</AlertDescription></Alert> : null}
        {jogos.length ? <PredictionSummary totalJogos={jogos.length} palpitesPreenchidos={palpitesPreenchidos} /> : null}
        {jogos.length ? <PredictionMatchList jogos={jogos} palpites={palpitesLocais} onUpdate={atualizarPalpite} /> : null}
        <Card className="bg-card/80 backdrop-blur-sm"><CardContent className="pt-6"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Você pode enviar quantos palpites quiser.</p><Button disabled={!jogos.length || !palpitesAlterados.size || salvandoPalpites} onClick={() => void enviarPalpites()}>Salvar palpites</Button></div>{mensagemEnvio ? <Alert className="mt-4" variant="success"><AlertDescription>{mensagemEnvio}</AlertDescription></Alert> : null}</CardContent></Card>
      </PageShell>
    </div>
  );
}
