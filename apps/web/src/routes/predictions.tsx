import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { PredictionMatchCard } from "@/components/predictions/prediction-match-card";
import { PredictionMatchList } from "@/components/predictions/prediction-match-list";
import type { Jogo, Palpite, PalpiteUpdate, PredictionSaveStatus } from "@/components/predictions/types";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAnswerPoolQuestionMutation, usePoolQuestionsListQuery } from "@/hooks/use-pool-questions-api";
import { usePoolsListQuery } from "@/hooks/use-pools-api";
import { useCreatePredictionMutation, usePredictionMatchComparisonQuery, usePredictionsListQuery, useUpdatePredictionMutation } from "@/hooks/use-predictions-api";
import { formatTeamNamePtBr } from "@/lib/team-names";

export const Route = createFileRoute("/predictions")({ component: PredictionsPage });

type ViewMode = "groups" | "list" | "timeline";
type StatusFilter = "all" | Jogo["status"];
type MatchBlock = { id: string; title: string; description: string; jogos: Jogo[] };

const stageLabels: Record<string, string> = {
  group: "Fase de grupos",
  r32: "16 avos",
  r16: "Oitavas",
  qf: "Quartas",
  sf: "Semifinal",
  third: "3º lugar",
  final: "Final",
};

const stageOrder = ["group", "r32", "r16", "qf", "sf", "third", "final"];
const timelineColumnWidth = 640;
const timelineColumnGap = 20;
const timelineColumnStep = timelineColumnWidth + timelineColumnGap;
const timelineBufferColumns = 2;

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

function shouldTriggerCanarinhoEasterEgg(jogo: Jogo, palpite: Palpite & { golsMandante: number; golsVisitante: number }) {
  const homeWins = palpite.golsMandante > palpite.golsVisitante;
  const awayWins = palpite.golsVisitante > palpite.golsMandante;
  const brazilLoses = (jogo.mandante === "Brasil" && awayWins) || (jogo.visitante === "Brasil" && homeWins);
  const argentinaWins = (jogo.mandante === "Argentina" && homeWins) || (jogo.visitante === "Argentina" && awayWins);

  return brazilLoses || argentinaWins;
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const key = getKey(item);
    acc[key] = [...(acc[key] ?? []), item];
    return acc;
  }, {});
}

function PredictionsPage() {
  const poolsQuery = usePoolsListQuery();
  const boloes = poolsQuery.data ?? [];
  const [bolaoSelecionadoId, setBolaoSelecionadoId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("groups");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedComparisonMatchId, setSelectedComparisonMatchId] = useState<string | null>(null);
  const predictionsQuery = usePredictionsListQuery(bolaoSelecionadoId);
  const comparisonQuery = usePredictionMatchComparisonQuery(bolaoSelecionadoId, selectedComparisonMatchId);
  const questionsQuery = usePoolQuestionsListQuery(bolaoSelecionadoId);
  const createPredictionMutation = useCreatePredictionMutation();
  const updatePredictionMutation = useUpdatePredictionMutation();
  const answerQuestionMutation = useAnswerPoolQuestionMutation(bolaoSelecionadoId);
  const savingIdsRef = useRef(new Set<string>());
  const [palpitesLocais, setPalpitesLocais] = useState<Record<string, Palpite>>({});
  const [palpitesAlterados, setPalpitesAlterados] = useState<Set<string>>(new Set());
  const [saveStatuses, setSaveStatuses] = useState<Record<string, PredictionSaveStatus>>({});
  const [respostasLivres, setRespostasLivres] = useState<Record<string, string>>({});
  const [mensagemResposta, setMensagemResposta] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [canarinhoAnimationKey, setCanarinhoAnimationKey] = useState(0);

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
    setSaveStatuses({});
    savingIdsRef.current.clear();
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
    const palpite = palpitesLocais[item.match.id] ?? { id: item.id, golsMandante: item.homeGoals, golsVisitante: item.awayGoals };
    const stageLabel = getStageLabel(item.match.stage);
    const rodada = item.match.stage === "group" ? `Grupo ${item.match.groupName ?? ""} · Rodada ${item.match.matchday ?? ""}` : `${stageLabel} · Jogo ${item.match.matchday ?? ""}`;
    const base = { bloqueado: startsAt <= new Date(), encerrado: !!item.match.finished };
    const status = getStatus(base, palpite);

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

  useEffect(() => {
    if (!bolaoSelecionadoId || !palpitesAlterados.size) return;

    const timeout = window.setTimeout(() => {
      for (const jogoId of palpitesAlterados) {
        const jogo = jogos.find((item) => item.id === jogoId);
        const palpite = palpitesLocais[jogoId];
        if (!jogo || jogo.bloqueado || !hasCompletePrediction(palpite) || savingIdsRef.current.has(jogoId)) continue;
        const completePalpite = palpite as Palpite & { golsMandante: number; golsVisitante: number };

        savingIdsRef.current.add(jogoId);
        setSaveStatuses((current) => ({ ...current, [jogoId]: "saving" }));

        const save = completePalpite.id
          ? updatePredictionMutation.mutateAsync({ id: completePalpite.id, homeGoals: completePalpite.golsMandante, awayGoals: completePalpite.golsVisitante })
          : createPredictionMutation.mutateAsync({ poolId: bolaoSelecionadoId, matchId: jogoId, homeGoals: completePalpite.golsMandante, awayGoals: completePalpite.golsVisitante });

        void save
          .then((result) => {
            if (shouldTriggerCanarinhoEasterEgg(jogo, completePalpite)) {
              setCanarinhoAnimationKey((current) => current + 1);
            }
            setPalpitesLocais((current) => ({
              ...current,
              [jogoId]: { ...(current[jogoId] ?? completePalpite), id: result?.id ?? current[jogoId]?.id ?? null },
            }));
            setPalpitesAlterados((current) => {
              const next = new Set(current);
              next.delete(jogoId);
              return next;
            });
            setSaveStatuses((current) => ({ ...current, [jogoId]: "saved" }));
          })
          .catch((error) => {
            setRequestError(error instanceof Error ? error.message : "Erro ao salvar palpite automaticamente.");
            setSaveStatuses((current) => ({ ...current, [jogoId]: "error" }));
          })
          .finally(() => {
            savingIdsRef.current.delete(jogoId);
          });
      }
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [bolaoSelecionadoId, createPredictionMutation, jogos, palpitesAlterados, palpitesLocais, updatePredictionMutation]);

  const jogosFiltrados = statusFilter === "all" ? jogos : jogos.filter((jogo) => jogo.status === statusFilter);
  const palpitesPreenchidos = jogos.filter((jogo) => hasCompletePrediction(palpitesLocais[jogo.id])).length;
  const pendentes = jogos.filter((jogo) => jogo.status === "missing").length;
  const encerrados = jogos.filter((jogo) => jogo.status === "finished").length;
  const bloqueados = jogos.filter((jogo) => jogo.status === "locked").length;
  const perguntasLivresVisiveis = (questionsQuery.data ?? []).filter((question) => question.answer?.isCorrect === null || question.answer?.isCorrect === undefined);

  const atualizarPalpite = ({ jogoId, lado, gols }: PalpiteUpdate) => {
    setPalpitesLocais((current) => {
      const atual = current[jogoId] ?? { id: null, golsMandante: null, golsVisitante: null };
      return { ...current, [jogoId]: { ...atual, golsMandante: lado === "mandante" ? gols : atual.golsMandante, golsVisitante: lado === "visitante" ? gols : atual.golsVisitante } };
    });
    setPalpitesAlterados((current) => new Set(current).add(jogoId));
    setSaveStatuses((current) => ({ ...current, [jogoId]: "dirty" }));
    setRequestError(null);
  };

  const selecionarBolao = (bolaoId: string) => {
    setBolaoSelecionadoId(bolaoId);
    setSelectedComparisonMatchId(null);
    setMensagemResposta(null);
    setRequestError(null);
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
      <CanarinhoEasterEgg animationKey={canarinhoAnimationKey} />
      <PageShell wide className="space-y-6">
        <PageHeader title="Palpites" description="Organize seus palpites por grupo, acompanhe pendências e navegue pelos jogos em timeline." />
        {requestError ? <Alert variant="destructive"><AlertTitle>Não foi possível salvar</AlertTitle><AlertDescription>{requestError}</AlertDescription></Alert> : null}

        <Card className="bg-card/80 backdrop-blur-sm"><CardContent className="space-y-3 pt-6"><p className="text-sm font-medium">Selecione o bolão</p><div className="flex flex-wrap gap-2">{boloes.map((bolao) => <Button key={bolao.id} variant={bolao.id === bolaoSelecionadoId ? "default" : "soft"} onClick={() => selecionarBolao(bolao.id)}>{bolao.name}</Button>)}</div></CardContent></Card>
        {poolsQuery.status === "pending" || predictionsQuery.status === "pending" || questionsQuery.status === "pending" ? <Alert variant="info"><AlertTitle>Carregando palpites</AlertTitle><AlertDescription>Buscando bolões, partidas, perguntas e palpites salvos.</AlertDescription></Alert> : null}
        {predictionsQuery.status === "error" ? <Alert variant="destructive"><AlertTitle>Erro ao carregar partidas</AlertTitle><AlertDescription>{predictionsQuery.error?.message || "Não foi possível carregar os dados."}</AlertDescription></Alert> : null}
        {questionsQuery.status === "error" ? <Alert variant="destructive"><AlertTitle>Erro ao carregar perguntas</AlertTitle><AlertDescription>{questionsQuery.error?.message || "Não foi possível carregar as perguntas."}</AlertDescription></Alert> : null}

        {questionsQuery.status === "success" && perguntasLivresVisiveis.length ? (
          <div className="space-y-4">
            <div><h2 className="text-xl font-semibold">Perguntas livres</h2><p className="text-sm text-muted-foreground">Responda as perguntas do bolão selecionado.</p></div>
            {mensagemResposta ? <Alert variant="success"><AlertDescription>{mensagemResposta}</AlertDescription></Alert> : null}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                    <CardHeader className="space-y-3"><CardTitle className="text-lg">{question.question}</CardTitle><p className="text-sm text-muted-foreground">Prazo: {closesAt.toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" })}</p><div className="flex flex-wrap gap-2"><Badge variant={closed ? "secondary" : "default"}>{closed ? "Fechada" : "Aberta"}</Badge><Badge variant="outline">{question.points} ponto(s)</Badge></div></CardHeader>
                    <CardContent className="space-y-3"><Textarea value={currentAnswer} onChange={(event) => setRespostasLivres((current) => ({ ...current, [question.id]: event.target.value }))} disabled={closed || answerQuestionMutation.isPending} placeholder="Digite sua resposta" /><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{closed ? "Prazo encerrado" : "Resposta livre até o prazo"}</p><Button disabled={answerButtonDisabled} onClick={() => void salvarRespostaLivre(question.id)}>{answerButtonText}</Button></div></CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : null}

        {predictionsQuery.status !== "pending" && !jogos.length ? <Alert variant="warning"><AlertTitle>Nenhuma partida importada</AlertTitle><AlertDescription>Importe a Copa do Mundo 2026 e crie um bolão ligado a esse torneio antes de registrar palpites.</AlertDescription></Alert> : null}
        {jogos.length ? (
          <Card className="bg-card/80 backdrop-blur-sm">
            <CardContent className="space-y-4 pt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <Button variant={viewMode === "groups" ? "default" : "soft"} onClick={() => setViewMode("groups")}>Grupos e fases</Button>
                  <Button variant={viewMode === "list" ? "default" : "soft"} onClick={() => setViewMode("list")}>Lista</Button>
                  <Button variant={viewMode === "timeline" ? "default" : "soft"} onClick={() => setViewMode("timeline")}>Timeline</Button>
                </div>
                {viewMode === "list" ? (
                  <div className="flex flex-wrap gap-2">
                    {[
                      ["all", "Todos"],
                      ["missing", "Sem palpite"],
                      ["saved", "Salvos"],
                      ["locked", "Bloqueados"],
                      ["finished", "Encerrados"],
                    ].map(([value, label]) => <Button key={value} size="sm" variant={statusFilter === value ? "default" : "outline"} onClick={() => setStatusFilter(value as StatusFilter)}>{label}</Button>)}
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3 text-sm text-muted-foreground">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{palpitesPreenchidos}/{jogos.length} preenchidos</Badge>
                  <Badge variant="warning">{pendentes} pendente(s)</Badge>
                  <Badge variant="secondary">{bloqueados} bloqueado(s)</Badge>
                  <Badge variant="outline">{encerrados} encerrado(s)</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {jogos.length && viewMode === "groups" ? <GroupedMatches jogos={jogos} palpites={palpitesLocais} saveStatuses={saveStatuses} onUpdate={atualizarPalpite} onCompare={setSelectedComparisonMatchId} /> : null}
        {jogos.length && viewMode === "list" ? <ListMatches jogos={jogosFiltrados} palpites={palpitesLocais} saveStatuses={saveStatuses} onUpdate={atualizarPalpite} onCompare={setSelectedComparisonMatchId} /> : null}
        {jogos.length && viewMode === "timeline" ? <TimelineMatches jogos={jogos} palpites={palpitesLocais} saveStatuses={saveStatuses} onUpdate={atualizarPalpite} onCompare={setSelectedComparisonMatchId} /> : null}
        {selectedComparisonMatchId ? <ComparisonModal data={comparisonQuery.data} status={comparisonQuery.status} error={comparisonQuery.error} onClose={() => setSelectedComparisonMatchId(null)} /> : null}
      </PageShell>
    </div>
  );
}

function CanarinhoEasterEgg({ animationKey }: { animationKey: number }) {
  useEffect(() => {
    if (!animationKey) return;

    const audio = new Audio("/aqui-e-o-brasil.mp3");
    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
  }, [animationKey]);

  if (!animationKey) return null;

  return createPortal(
    <div key={animationKey} className="pointer-events-none fixed inset-0 z-[1000] overflow-hidden">
      <img src="/canarinho.png" alt="" aria-hidden="true" className="absolute top-[90%] w-[min(88vw,720px)] -translate-y-1/2 animate-[canarinho-slide_7.2s_ease-in-out_forwards] select-none drop-shadow-2xl" />
      <style>{`
        @keyframes canarinho-slide {
          0% {
            left: calc(100% + 280px);
            opacity: 0;
            transform: translateY(-50%) translateX(0) scale(0.98);
          }
          14% {
            opacity: 1;
          }
          78% {
            left: 50%;
            opacity: 1;
            transform: translateY(-50%) translateX(-50%) scale(1);
          }
          100% {
            left: 50%;
            opacity: 0;
            transform: translateY(-50%) translateX(-50%) scale(0.96);
          }
        }
      `}</style>
    </div>,
    document.body,
  );
}

function buildMatchBlocks(jogos: Jogo[]): MatchBlock[] {
  const groupMatches = groupBy(jogos.filter((jogo) => jogo.stage === "group"), (jogo) => jogo.groupName ?? "-");
  const knockoutMatches = groupBy(jogos.filter((jogo) => jogo.stage !== "group"), (jogo) => jogo.stage ?? "outros");
  const groupBlocks = Object.keys(groupMatches).sort().map((groupName) => ({ id: `group-${groupName}`, title: `Grupo ${groupName}`, description: "Fase de grupos", jogos: groupMatches[groupName] ?? [] }));
  const knockoutBlocks = Object.keys(knockoutMatches).sort((a, b) => stageOrder.indexOf(a) - stageOrder.indexOf(b)).map((stage) => ({ id: `stage-${stage}`, title: getStageLabel(stage), description: "Mata-mata", jogos: knockoutMatches[stage] ?? [] }));
  return [...groupBlocks, ...knockoutBlocks];
}

function GroupedMatches({ jogos, palpites, saveStatuses, onUpdate, onCompare }: { jogos: Jogo[]; palpites: Record<string, Palpite>; saveStatuses: Record<string, PredictionSaveStatus>; onUpdate: (payload: PalpiteUpdate) => void; onCompare: (jogoId: string) => void }) {
  const blocks = buildMatchBlocks(jogos);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const selectedBlock = blocks.find((block) => block.id === selectedBlockId) ?? null;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {blocks.map((block) => <MatchBlockCard key={block.id} block={block} selected={selectedBlock?.id === block.id} onSelect={() => setSelectedBlockId(block.id)} />)}
      </div>
      {selectedBlock ? (
        <MatchesModal title={selectedBlock.title} description={selectedBlock.description} onClose={() => setSelectedBlockId(null)}>
          <MatchSection title="Partidas" jogos={selectedBlock.jogos} palpites={palpites} saveStatuses={saveStatuses} onUpdate={onUpdate} onCompare={onCompare} empty="Nenhum jogo encontrado neste bloco." />
        </MatchesModal>
      ) : null}
      {!blocks.length ? <Card><CardContent className="pt-6 text-sm text-muted-foreground">Nenhum bloco encontrado.</CardContent></Card> : null}
    </div>
  );
}

function MatchBlockCard({ block, selected, onSelect }: { block: MatchBlock; selected: boolean; onSelect: () => void }) {
  const filled = block.jogos.filter((jogo) => jogo.status !== "missing").length;
  const missing = block.jogos.filter((jogo) => jogo.status === "missing").length;
  const finished = block.jogos.filter((jogo) => jogo.status === "finished").length;
  const nextGame = block.jogos.find((jogo) => jogo.startsAt >= new Date()) ?? block.jogos[0];

  return (
    <button type="button" onClick={onSelect} className={`rounded-xl border bg-card p-4 text-left shadow transition hover:border-primary/50 hover:bg-accent/40 ${selected ? "border-primary ring-2 ring-primary/20" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div><p className="font-semibold">{block.title}</p><p className="text-xs text-muted-foreground">{block.description}</p></div>
        <Badge variant={missing ? "warning" : "success"}>{filled}/{block.jogos.length}</Badge>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <Metric label="Faltam" value={missing} compact />
        <Metric label="Enc." value={finished} compact />
        <Metric label="Jogos" value={block.jogos.length} compact />
      </div>
      <p className="mt-3 truncate text-xs text-muted-foreground">Próximo: {nextGame ? `${nextGame.mandante} x ${nextGame.visitante}` : "-"}</p>
    </button>
  );
}

function ListMatches({ jogos, palpites, saveStatuses, onUpdate, onCompare }: { jogos: Jogo[]; palpites: Record<string, Palpite>; saveStatuses: Record<string, PredictionSaveStatus>; onUpdate: (payload: PalpiteUpdate) => void; onCompare: (jogoId: string) => void }) {
  const needsAction = jogos.filter((jogo) => jogo.status === "missing");
  const waiting = jogos.filter((jogo) => jogo.status === "saved");
  const blockedMissing = jogos.filter((jogo) => jogo.status === "locked" && !hasCompletePrediction(palpites[jogo.id]));

  return (
    <div className="space-y-6">
      <MatchSection title="" jogos={needsAction} palpites={palpites} saveStatuses={saveStatuses} onUpdate={onUpdate} onCompare={onCompare} empty="Nenhum palpite faltante no filtro atual." hideHeader />
      <MatchSection title="Salvos aguardando resultado" description="Jogos com palpite registrado e ainda não finalizados." jogos={waiting} palpites={palpites} saveStatuses={saveStatuses} onUpdate={onUpdate} onCompare={onCompare} empty="Nenhum jogo salvo aguardando resultado." />
      <MatchSection title="Bloqueados sem palpite" description="Jogos que já começaram ou fecharam antes de receber seu palpite." jogos={blockedMissing} palpites={palpites} saveStatuses={saveStatuses} onUpdate={onUpdate} onCompare={onCompare} empty="Nenhum bloqueado sem palpite." />
    </div>
  );
}

function TimelineMatches({ jogos, palpites, saveStatuses, onUpdate, onCompare }: { jogos: Jogo[]; palpites: Record<string, Palpite>; saveStatuses: Record<string, PredictionSaveStatus>; onUpdate: (payload: PalpiteUpdate) => void; onCompare: (jogoId: string) => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const didInitialScrollRef = useRef(false);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const sortedJogos = [...jogos].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const now = new Date();
  const todayKey = getDateKey(now);
  const focusJogo = sortedJogos.find((jogo) => jogo.startsAt >= now && jogo.status === "missing") ?? sortedJogos.find((jogo) => jogo.startsAt >= now) ?? sortedJogos.at(-1);
  const focusDayKey = focusJogo ? getDateKey(focusJogo.startsAt) : todayKey;
  const byDay = groupBy(sortedJogos, (jogo) => getDateKey(jogo.startsAt));
  const days = Array.from(new Set([...Object.keys(byDay), todayKey])).sort();
  const visibleStart = Math.max(0, activeDayIndex - timelineBufferColumns);
  const visibleEnd = Math.min(days.length, activeDayIndex + timelineBufferColumns + 1);
  const visibleDays = days.slice(visibleStart, visibleEnd);
  const beforeWidth = visibleStart * timelineColumnStep;
  const afterWidth = Math.max(0, days.length - visibleEnd) * timelineColumnStep;

  const scrollToDayIndex = (index: number) => {
    const nextIndex = Math.max(0, Math.min(days.length - 1, index));
    setActiveDayIndex(nextIndex);
    containerRef.current?.scrollTo({ left: nextIndex * timelineColumnStep, behavior: "smooth" });
  };

  const scrollTimeline = (direction: "previous" | "next") => {
    scrollToDayIndex(activeDayIndex + (direction === "next" ? 1 : -1));
  };

  const scrollToToday = () => {
    const todayIndex = days.indexOf(todayKey);
    if (todayIndex >= 0) scrollToDayIndex(todayIndex);
  };

  const handleTimelineScroll = () => {
    if (scrollFrameRef.current !== null) return;
    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      const container = containerRef.current;
      if (!container) return;
      const nextIndex = Math.max(0, Math.min(days.length - 1, Math.round(container.scrollLeft / timelineColumnStep)));
      setActiveDayIndex((current) => (current === nextIndex ? current : nextIndex));
    });
  };

  useEffect(() => {
    if (didInitialScrollRef.current || !days.length) return;
    const focusIndex = Math.max(0, days.indexOf(focusDayKey));
    didInitialScrollRef.current = true;
    setActiveDayIndex(focusIndex);
    window.requestAnimationFrame(() => {
      containerRef.current?.scrollTo({ left: focusIndex * timelineColumnStep });
    });
  }, [days, focusDayKey]);

  useEffect(() => () => {
    if (scrollFrameRef.current !== null) window.cancelAnimationFrame(scrollFrameRef.current);
  }, []);

  return (
    <Card className="overflow-hidden bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <div className="flex justify-center">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => scrollTimeline("previous")}>Anterior</Button>
            <Button variant="default" size="sm" className="shadow-md" onClick={scrollToToday}>Hoje</Button>
            <Button variant="outline" size="sm" onClick={() => scrollTimeline("next")}>Próximo</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div ref={containerRef} className="overflow-x-auto pb-4" onScroll={handleTimelineScroll}>
          <div className="flex min-w-max">
            {beforeWidth ? <div aria-hidden="true" className="shrink-0" style={{ width: beforeWidth }} /> : null}
            {visibleDays.map((day) => {
              const dayMatches = byDay[day] ?? [];
              return (
                <div key={day} data-timeline-anchor className="mr-5 min-h-[64rem] w-[40rem] shrink-0 scroll-ml-4 space-y-3">
                  <div className={`sticky left-0 z-10 rounded-full border px-3 py-1 text-sm font-semibold shadow-sm ${day === todayKey ? "border-primary bg-primary text-primary-foreground" : "bg-background"}`}>{formatTimelineDay(new Date(`${day}T12:00:00`), now)}</div>
                  <div className="space-y-3">
                    {dayMatches.length ? dayMatches.map((jogo) => (
                      <div key={jogo.id}>
                        <PredictionMatchCard jogo={jogo} palpite={palpites[jogo.id] ?? { golsMandante: null, golsVisitante: null }} onUpdate={onUpdate} onCompare={onCompare} saveStatus={saveStatuses[jogo.id] ?? "idle"} compact timeline />
                      </div>
                    )) : <Card><CardContent className="pt-6 text-sm text-muted-foreground">Nenhum jogo neste dia.</CardContent></Card>}
                  </div>
                </div>
              );
            })}
            {afterWidth ? <div aria-hidden="true" className="shrink-0" style={{ width: afterWidth }} /> : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTimelineDay(day: Date, now: Date) {
  if (day.toDateString() === now.toDateString()) return "Hoje";
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (day.toDateString() === tomorrow.toDateString()) return "Amanhã";
  return day.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function MatchSection({ title, description, jogos, palpites, saveStatuses, onUpdate, onCompare, empty = "Nenhum jogo encontrado.", hideHeader = false }: { title: string; description?: string; jogos: Jogo[]; palpites: Record<string, Palpite>; saveStatuses: Record<string, PredictionSaveStatus>; onUpdate: (payload: PalpiteUpdate) => void; onCompare: (jogoId: string) => void; empty?: string; hideHeader?: boolean }) {
  const filled = jogos.filter((jogo) => hasCompletePrediction(palpites[jogo.id])).length;

  return (
    <section className="space-y-3">
      {!hideHeader ? <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="text-xl font-semibold">{title}</h2>{description ? <p className="text-sm text-muted-foreground">{description}</p> : null}</div>
        <Badge variant="outline">{filled}/{jogos.length} preenchidos</Badge>
      </div> : null}
      {jogos.length ? <PredictionMatchList jogos={jogos} palpites={palpites} saveStatuses={saveStatuses} onUpdate={onUpdate} onCompare={onCompare} compact /> : <Card><CardContent className="pt-6 text-sm text-muted-foreground">{empty}</CardContent></Card>}
    </section>
  );
}

function MatchesModal({ title, description, children, onClose }: { title: string; description?: string; children: ReactNode; onClose: () => void }) {
  return (
    <ModalShell onClose={onClose} className="max-w-6xl">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><CardTitle>{title}</CardTitle>{description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}</div>
          <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </ModalShell>
  );
}

function ComparisonModal({ data, status, error, onClose }: { data: ReturnType<typeof usePredictionMatchComparisonQuery>["data"]; status: string; error: Error | null; onClose: () => void }) {
  return (
    <ModalShell onClose={onClose} className="max-w-4xl">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><CardTitle>Comparação do jogo</CardTitle><p className="mt-1 text-sm text-muted-foreground">Palpites dos participantes ficam visíveis após o início do jogo.</p></div>
          <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === "pending" ? <Alert variant="info"><AlertTitle>Carregando comparação</AlertTitle><AlertDescription>Buscando palpites e pontuação por participante.</AlertDescription></Alert> : null}
        {status === "error" ? <Alert variant="destructive"><AlertTitle>Erro ao comparar</AlertTitle><AlertDescription>{error?.message ?? "Não foi possível carregar a comparação."}</AlertDescription></Alert> : null}
        {data ? (
          <>
            {!data.canCompare ? <Alert variant="warning"><AlertTitle>Comparação bloqueada</AlertTitle><AlertDescription>Antes do início da partida, apenas o seu palpite fica visível.</AlertDescription></Alert> : null}
            <div className="grid gap-3 md:grid-cols-4">
              <Metric label="Mandante" value={data.distribution.homeWinCount} />
              <Metric label="Empate" value={data.distribution.drawCount} />
              <Metric label="Visitante" value={data.distribution.awayWinCount} />
              <Metric label="Mesmo palpite" value={data.distribution.sameAsCurrentUserCount} />
            </div>
            <div className="space-y-2">
              {data.participants.map((participant) => (
                <div key={participant.userId} className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 ${participant.isCurrentUser ? "border-primary bg-primary/5" : ""}`}>
                  <div><p className="font-medium">{participant.name}{participant.isCurrentUser ? " (você)" : ""}</p><p className="text-xs text-muted-foreground">{participant.email}</p></div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={participant.hasPrediction ? "default" : "secondary"}>{participant.hasPrediction ? `${participant.homeGoals} x ${participant.awayGoals}` : "Sem palpite visível"}</Badge>
                    <Badge variant={participant.resultType === "exact" ? "success" : participant.resultType === "outcome" ? "warning" : "outline"}>{participant.points} pts</Badge>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </CardContent>
    </ModalShell>
  );
}

function ModalShell({ children, onClose, className = "" }: { children: ReactNode; onClose: () => void; className?: string }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-background/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <button type="button" aria-label="Fechar modal" className="fixed inset-0 cursor-default" onClick={onClose} />
      <Card className={`relative max-h-[90vh] w-full overflow-y-auto border-primary/30 bg-card shadow-2xl ${className}`}>{children}</Card>
    </div>
  );
}

function Metric({ label, value, compact = false }: { label: string; value: number; compact?: boolean }) {
  return <div className={`rounded-lg border bg-background/60 ${compact ? "p-2" : "p-3"}`}><p className="text-xs text-muted-foreground">{label}</p><p className={compact ? "text-lg font-semibold" : "text-2xl font-semibold"}>{value}</p></div>;
}
