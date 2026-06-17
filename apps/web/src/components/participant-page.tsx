import { Link } from "@tanstack/react-router";
import { AlertTriangle, BarChart3, FileText } from "lucide-react";
import type { KeyboardEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { PredictionMatchCard } from "@/components/predictions/prediction-match-card";
import { PredictionMatchList } from "@/components/predictions/prediction-match-list";
import type { Jogo, Palpite, PalpiteUpdate, PredictionSaveStatus } from "@/components/predictions/types";
import { TeamFlag } from "@/components/team-flag";
import { formatMatchDateTime } from "@/components/match-time";
import { PageShell } from "@/components/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAnswerPoolQuestionMutation, usePoolQuestionComparisonQuery, usePoolQuestionsListQuery } from "@/hooks/use-pool-questions-api";
import { usePoolScoringConfigQuery, usePoolScoringRankingQuery } from "@/hooks/use-pool-scoring-api";
import { usePoolsListQuery } from "@/hooks/use-pools-api";
import { useCreatePredictionMutation, usePredictionMatchComparisonQuery, usePredictionsListQuery, useUpdatePredictionMutation } from "@/hooks/use-predictions-api";
import { useSessionQuery } from "@/hooks/use-session-api";
import { useSyncWorldCupMutation, useTournamentsListQuery } from "@/hooks/use-tournaments-api";
import { formatTeamNamePtBr } from "@/lib/team-names";
import { cn } from "@/lib/utils";

type ViewMode = "timeline" | "groups" | "list" | "questions";
type StatusFilter = "all" | Jogo["status"];
type MatchBlock = { id: string; title: string; description: string; jogos: Jogo[] };
type FreeQuestion = { id: string; question: string; points: number; closesAt: Date | string; answer: { id: string; answer: string; isCorrect: boolean | null } | null };
type PredictionEasterEgg = { key: number; variant: "canarinho" | "tsubasa" | "usa-loss" | "japan-loss" | "cr7" | "memphis" | "germany-audio" | "mexico-loss" | "south-korea-win" | "spain-win" | "france-win" | "colombia-win" } | null;

const stageLabels: Record<string, string> = {
  group: "Fase de grupos",
  r32: "16 Avos",
  r16: "Oitavas",
  qf: "Quartas",
  sf: "Seminal",
  third: "Terceiro Lugar",
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

function getPredictionEasterEgg(jogo: Jogo, palpite: Palpite & { golsMandante: number; golsVisitante: number }): PredictionEasterEgg {
  const homeWins = palpite.golsMandante > palpite.golsVisitante;
  const awayWins = palpite.golsVisitante > palpite.golsMandante;
  const brazilLoses = (jogo.mandante === "Brasil" && awayWins) || (jogo.visitante === "Brasil" && homeWins);
  const argentinaWins = (jogo.mandante === "Argentina" && homeWins) || (jogo.visitante === "Argentina" && awayWins);
  const germanyWins = (jogo.mandante === "Alemanha" && homeWins) || (jogo.visitante === "Alemanha" && awayWins);
  const mexicoLoses = (jogo.mandante === "México" && awayWins) || (jogo.visitante === "México" && homeWins);
  const southKoreaWins = (jogo.mandante === "Coreia do Sul" && homeWins) || (jogo.visitante === "Coreia do Sul" && awayWins);
  const spainWins = (jogo.mandante === "Espanha" && homeWins) || (jogo.visitante === "Espanha" && awayWins);
  const franceWins = (jogo.mandante === "França" && homeWins) || (jogo.visitante === "França" && awayWins);
  const colombiaWins = (jogo.mandante === "Colômbia" && homeWins) || (jogo.visitante === "Colômbia" && awayWins);
  const portugalWins = (jogo.mandante === "Portugal" && homeWins) || (jogo.visitante === "Portugal" && awayWins);
  const netherlandsWins = (jogo.mandante === "Países Baixos" && homeWins) || (jogo.visitante === "Países Baixos" && awayWins);
  const japanWins = (jogo.mandante === "Japão" && homeWins) || (jogo.visitante === "Japão" && awayWins);
  const japanLoses = (jogo.mandante === "Japão" && awayWins) || (jogo.visitante === "Japão" && homeWins);
  const usaLoses = (jogo.mandante === "Estados Unidos" && awayWins) || (jogo.visitante === "Estados Unidos" && homeWins);

  if (germanyWins) return { key: Date.now(), variant: "germany-audio" };
  if (mexicoLoses) return { key: Date.now(), variant: "mexico-loss" };
  if (southKoreaWins) return { key: Date.now(), variant: "south-korea-win" };
  if (spainWins) return { key: Date.now(), variant: "spain-win" };
  if (franceWins) return { key: Date.now(), variant: "france-win" };
  if (colombiaWins) return { key: Date.now(), variant: "colombia-win" };
  if (portugalWins) return { key: Date.now(), variant: "cr7" };
  if (netherlandsWins) return { key: Date.now(), variant: "memphis" };
  if (brazilLoses || argentinaWins) return { key: Date.now(), variant: "canarinho" };
  if (japanWins) return { key: Date.now(), variant: "tsubasa" };
  if (japanLoses) return { key: Date.now(), variant: "japan-loss" };
  if (usaLoses) return { key: Date.now(), variant: "usa-loss" };
  return null;
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const key = getKey(item);
    acc[key] = [...(acc[key] ?? []), item];
    return acc;
  }, {});
}

function NavigationPanel({
  viewMode,
  statusFilter,
  setViewMode,
  setStatusFilter,
  palpitesPreenchidos,
  totalJogos,
  pendentes,
  bloqueados,
  encerrados,
  jogosHoje,
  jogosSemPontuacao,
  perguntasSemResposta,
}: {
  viewMode: ViewMode;
  statusFilter: StatusFilter;
  setViewMode: (viewMode: ViewMode) => void;
  setStatusFilter: (statusFilter: StatusFilter) => void;
  palpitesPreenchidos: number;
  totalJogos: number;
  pendentes: number;
  bloqueados: number;
  encerrados: number;
  jogosHoje: number;
  jogosSemPontuacao: number;
  perguntasSemResposta: number;
}) {
  return (
    <Card className="overflow-hidden border-primary/10 bg-card/95 shadow-sm">
      <CardContent className="space-y-5 p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium">Área de jogo</p>
            <p className="text-sm text-muted-foreground">Navegue por calendário, grupos, lista completa ou perguntas livres.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <TabButton active={viewMode === "timeline"} onClick={() => setViewMode("timeline")}>Timeline <Badge variant="secondary">{jogosHoje} hoje</Badge></TabButton>
            <TabButton active={viewMode === "groups"} onClick={() => setViewMode("groups")}>Grupos e fases <Badge variant={jogosSemPontuacao ? "warning" : "secondary"}>{jogosSemPontuacao} sem pontuação</Badge></TabButton>
            <TabButton active={viewMode === "list"} onClick={() => setViewMode("list")}>Lista</TabButton>
            <TabButton active={viewMode === "questions"} onClick={() => setViewMode("questions")}>Perguntas <Badge variant={perguntasSemResposta ? "warning" : "secondary"}>{perguntasSemResposta} sem resposta</Badge></TabButton>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t pt-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{palpitesPreenchidos}/{totalJogos} preenchidos</Badge>
            <Badge variant="warning">{pendentes} pendente(s)</Badge>
            <Badge variant="secondary">{bloqueados} bloqueado(s)</Badge>
            <Badge variant="outline">{encerrados} encerrado(s)</Badge>
          </div>
          {viewMode === "list" ? (
            <div className="flex flex-wrap gap-2 rounded-lg bg-muted p-1">
              {[
                ["all", "Todos"],
                ["missing", "Sem palpite"],
                ["saved", "Salvos"],
                ["locked", "Bloqueados"],
                ["finished", "Encerrados"],
              ].map(([value, label]) => <Button key={value} size="sm" variant={statusFilter === value ? "default" : "ghost"} onClick={() => setStatusFilter(value as StatusFilter)}>{label}</Button>)}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <Button variant={active ? "default" : "outline"} className="h-auto flex-wrap justify-start py-2" onClick={onClick}>{children}</Button>;
}

function PendingHomeAlert({
  missingTodayPredictions,
  missingTomorrowPredictions,
  unansweredQuestions,
  onOpenPredictions,
  onOpenQuestions,
}: {
  missingTodayPredictions: number;
  missingTomorrowPredictions: number;
  unansweredQuestions: number;
  onOpenPredictions: () => void;
  onOpenQuestions: () => void;
}) {
  const hasPendingPredictions = missingTodayPredictions > 0 || missingTomorrowPredictions > 0;
  const hasUnansweredQuestions = unansweredQuestions > 0;

  if (!hasPendingPredictions && !hasUnansweredQuestions) return null;

  return (
    <Alert variant="destructive" className="border-red-500/70 bg-linear-to-r from-red-200 via-red-300 to-red-200 text-red-950 shadow-md shadow-red-500/20">
      <AlertTitle className="flex items-center gap-2">
        <AlertTriangle className="size-5 shrink-0" />
        <span>Aviso importante</span>
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <div className="space-y-1">
          {hasPendingPredictions ? (
            <p>
              Ainda faltam {missingTodayPredictions} palpite(s) de jogo(s) de hoje e {missingTomorrowPredictions} de amanhã.
            </p>
          ) : null}
          {hasUnansweredQuestions ? (
            <p>
              Existem {unansweredQuestions} pergunta(s) ainda não finalizada(s) sem resposta.
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {hasPendingPredictions ? <Button size="sm" variant="outline" onClick={onOpenPredictions}>Ver palpites pendentes</Button> : null}
          {hasUnansweredQuestions ? <Button size="sm" variant="outline" onClick={onOpenQuestions}>Ver perguntas pendentes</Button> : null}
        </div>
      </AlertDescription>
    </Alert>
  );
}

function TermsAcceptance() {
  const openTerms = () => window.open("/termos-cobranca.html", "_blank", "noopener,noreferrer");
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openTerms();
  };

  return (
    <div
      role="link"
      tabIndex={0}
      className="flex w-full items-start gap-3 rounded-xl border border-border bg-card/80 p-4 text-left shadow-sm transition hover:border-primary/50 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      onClick={openTerms}
      onKeyDown={handleKeyDown}
    >
      <input
        type="checkbox"
        checked
        readOnly
        aria-label="Termos de uso aceitos"
        className="mt-1 size-4 accent-primary"
      />
      <span className="flex-1 text-sm leading-6">
        <span className="font-semibold">Eu concordo com os termos de uso e cobrança</span>
      </span>
      <FileText className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
    </div>
  );
}

function FreeQuestions({ perguntas, respostasLivres, mensagemResposta, answerQuestionPending, onAnswerChange, onSave, onCompare }: { perguntas: FreeQuestion[]; respostasLivres: Record<string, string>; mensagemResposta: string | null; answerQuestionPending: boolean; onAnswerChange: (questionId: string, answer: string) => void; onSave: (questionId: string) => void; onCompare: (questionId: string) => void }) {
  const sortedPerguntas = [...perguntas].sort((a, b) => {
    const aHasAnswer = !!a.answer?.answer?.trim();
    const bHasAnswer = !!b.answer?.answer?.trim();
    if (aHasAnswer === bHasAnswer) return 0;
    return aHasAnswer ? 1 : -1;
  });

  return (
    <div className="space-y-4">
      <div><h2 className="text-xl font-semibold">Perguntas livres</h2><p className="text-sm text-muted-foreground">Responda as perguntas do bolão selecionado junto da sua rotina de jogos.</p></div>
      {mensagemResposta ? <Alert variant="success"><AlertDescription>{mensagemResposta}</AlertDescription></Alert> : null}
      {sortedPerguntas.length ? (
        <div className="space-y-4">
          {sortedPerguntas.map((question) => {
            const closesAt = new Date(question.closesAt);
            const closed = closesAt <= new Date();
            const savedAnswer = question.answer?.answer ?? "";
            const currentAnswer = respostasLivres[question.id] ?? "";
            const hasSavedAnswer = !!question.answer?.id;
            const answerChanged = currentAnswer.trim() !== savedAnswer.trim();
            const answerButtonText = hasSavedAnswer ? "Atualizar resposta" : "Salvar resposta";
            const answerButtonDisabled = closed || !currentAnswer.trim() || answerQuestionPending || (hasSavedAnswer && !answerChanged);
            return (
              <Card key={question.id} className="bg-card/80 backdrop-blur-sm">
                <CardHeader className="space-y-3 pb-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-lg">{question.question}</CardTitle>
                      <Badge variant={closed ? "secondary" : "default"}>{closed ? "Fechada" : "Aberta"}</Badge>
                      <Badge variant="outline">{question.points} ponto(s)</Badge>
                      {!savedAnswer.trim() ? <Badge variant="warning">Sem resposta</Badge> : null}
                    </div>
                    <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs" onClick={() => onCompare(question.id)}>
                      <BarChart3 className="size-3" /> Comparar
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">Prazo: {closesAt.toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" })}</p>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{closed ? "Prazo encerrado" : "Resposta livre até o prazo"}</p>
                    <Input value={currentAnswer} onChange={(event) => onAnswerChange(question.id, event.target.value)} disabled={closed || answerQuestionPending} placeholder="Digite sua resposta" />
                  </div>
                  <Button className="w-full md:w-auto" disabled={answerButtonDisabled} onClick={() => onSave(question.id)}>{answerButtonText}</Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : <Card><CardContent className="pt-6 text-sm text-muted-foreground">Nenhuma pergunta livre disponível neste bolão.</CardContent></Card>}
    </div>
  );
}

export function ParticipantPage() {
  const poolsQuery = usePoolsListQuery();
  const sessionQuery = useSessionQuery();
  const boloes = poolsQuery.data ?? [];
  const [bolaoSelecionadoId, setBolaoSelecionadoId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("timeline");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedComparisonMatchId, setSelectedComparisonMatchId] = useState<string | null>(null);
  const [selectedComparisonQuestionId, setSelectedComparisonQuestionId] = useState<string | null>(null);
  const predictionsQuery = usePredictionsListQuery(bolaoSelecionadoId);
  const scoringConfigQuery = usePoolScoringConfigQuery(bolaoSelecionadoId);
  const rankingQuery = usePoolScoringRankingQuery(bolaoSelecionadoId);
  const comparisonQuery = usePredictionMatchComparisonQuery(bolaoSelecionadoId, selectedComparisonMatchId);
  const questionsQuery = usePoolQuestionsListQuery(bolaoSelecionadoId);
  const questionComparisonQuery = usePoolQuestionComparisonQuery(bolaoSelecionadoId, selectedComparisonQuestionId);
  const tournamentsQuery = useTournamentsListQuery();
  const createPredictionMutation = useCreatePredictionMutation();
  const updatePredictionMutation = useUpdatePredictionMutation();
  const answerQuestionMutation = useAnswerPoolQuestionMutation(bolaoSelecionadoId);
  const syncWorldCupMutation = useSyncWorldCupMutation();
  const savingIdsRef = useRef(new Set<string>());
  const [palpitesSalvos, setPalpitesSalvos] = useState<Record<string, Palpite>>({});
  const [palpitesLocais, setPalpitesLocais] = useState<Record<string, Palpite>>({});
  const [palpitesAlterados, setPalpitesAlterados] = useState<Set<string>>(new Set());
  const [saveStatuses, setSaveStatuses] = useState<Record<string, PredictionSaveStatus>>({});
  const [respostasLivres, setRespostasLivres] = useState<Record<string, string>>({});
  const [respostasLivresAlteradas, setRespostasLivresAlteradas] = useState<Set<string>>(new Set());
  const [mensagemResposta, setMensagemResposta] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [predictionEasterEgg, setPredictionEasterEgg] = useState<PredictionEasterEgg>(null);

  useEffect(() => {
    if (!bolaoSelecionadoId && boloes[0]) setBolaoSelecionadoId(boloes[0].id);
  }, [bolaoSelecionadoId, boloes]);

  useEffect(() => {
    const nextPalpites = (predictionsQuery.data ?? []).reduce<Record<string, Palpite>>((acc, item) => {
      acc[item.match.id] = { id: item.id, golsMandante: item.homeGoals, golsVisitante: item.awayGoals };
      return acc;
    }, {});
    setPalpitesSalvos(nextPalpites);
    setPalpitesLocais(nextPalpites);
    setPalpitesAlterados(new Set());
    setSaveStatuses({});
    savingIdsRef.current.clear();
  }, [predictionsQuery.data]);

  useEffect(() => {
    setRespostasLivres((current) => (questionsQuery.data ?? []).reduce<Record<string, string>>((acc, question) => {
      const currentAnswer = current[question.id];
      acc[question.id] = respostasLivresAlteradas.has(question.id) && currentAnswer !== undefined ? currentAnswer : question.answer?.answer ?? "";
      return acc;
    }, {}));
  }, [questionsQuery.data, respostasLivresAlteradas]);

  const jogos: Jogo[] = (predictionsQuery.data ?? []).map((item) => {
    const startsAt = new Date(item.match.startsAt);
    const palpiteSalvo = palpitesSalvos[item.match.id] ?? { id: item.id, golsMandante: item.homeGoals, golsVisitante: item.awayGoals };
    const stageLabel = getStageLabel(item.match.stage);
    const rodada = item.match.stage === "group" ? `Grupo ${item.match.groupName ?? ""} · Rodada ${item.match.matchday ?? ""}` : `${stageLabel} · Jogo ${item.match.matchday ?? ""}`;
    const base = { bloqueado: startsAt <= new Date(), encerrado: !!item.match.finished };
    const status = getStatus(base, palpiteSalvo);

    return {
      id: item.match.id,
      rodada,
      stage: item.match.stage,
      stageLabel,
      groupName: item.match.groupName,
      matchday: item.match.matchday,
      horario: formatMatchDateTime(startsAt),
      startsAt,
      startsAtTimeZone: item.match.startsAtTimeZone,
      estadio: item.match.stadiumName,
      cidade: item.match.stadiumCity,
      mandante: formatTeamNamePtBr(item.match.homeTeamLabel ?? item.match.homeTeam),
      visitante: formatTeamNamePtBr(item.match.awayTeamLabel ?? item.match.awayTeam),
      mandanteEmoji: item.match.homeTeamEmoji,
      visitanteEmoji: item.match.awayTeamEmoji,
      mandanteRankingFifa: item.match.homeTeamFifaRankingPosition,
      visitanteRankingFifa: item.match.awayTeamFifaRankingPosition,
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
      pontosGanhos: item.points,
      oddBonusRules: scoringConfigQuery.data?.oddBonusRules ?? [],
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
            setPredictionEasterEgg(getPredictionEasterEgg(jogo, completePalpite));
            setPalpitesLocais((current) => ({
              ...current,
              [jogoId]: { ...(current[jogoId] ?? completePalpite), id: result?.id ?? current[jogoId]?.id ?? null },
            }));
            setPalpitesSalvos((current) => ({
              ...current,
              [jogoId]: { ...completePalpite, id: result?.id ?? completePalpite.id ?? current[jogoId]?.id ?? null },
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
  const perguntasSemResposta = perguntasLivresVisiveis.filter((question) => !question.answer?.answer?.trim()).length;
  const now = new Date();
  const todayKey = getDateKey(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowKey = getDateKey(tomorrow);
  const missingTodayPredictions = jogos.filter((jogo) => !jogo.encerrado && !hasCompletePrediction(palpitesLocais[jogo.id]) && getDateKey(jogo.startsAt) === todayKey).length;
  const missingTomorrowPredictions = jogos.filter((jogo) => !jogo.encerrado && !hasCompletePrediction(palpitesLocais[jogo.id]) && getDateKey(jogo.startsAt) === tomorrowKey).length;
  const jogosHoje = jogos.filter((jogo) => getDateKey(jogo.startsAt) === getDateKey(new Date())).length;
  const jogosSemPontuacao = jogos.filter((jogo) => !jogo.pontuacao).length;
  const currentUserId = sessionQuery.data?.user?.id;
  const isAdmin = !!sessionQuery.data?.user?.isAdmin;
  const ranking = rankingQuery.data ?? [];
  const userRankingIndex = ranking.findIndex((entry) => entry.userId === currentUserId);
  const userScore = userRankingIndex >= 0 ? ranking[userRankingIndex] : null;
  const bolaoSelecionado = boloes.find((bolao) => bolao.id === bolaoSelecionadoId) ?? null;
  const worldCupTournament = (tournamentsQuery.data ?? []).find((item) => item.externalSource === "worldcup2026" && item.season === "2026");
  const lastSyncedAt = worldCupTournament?.lastSyncedAt ? new Date(worldCupTournament.lastSyncedAt) : null;
  const lastSyncedLabel = lastSyncedAt
    ? lastSyncedAt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
    : "Ainda não atualizado";

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
    setSelectedComparisonQuestionId(null);
    setRespostasLivresAlteradas(new Set());
    setMensagemResposta(null);
    setRequestError(null);
  };

  const atualizarRespostaLivre = (questionId: string, answer: string) => {
    setRespostasLivres((current) => ({ ...current, [questionId]: answer }));
    setRespostasLivresAlteradas((current) => new Set(current).add(questionId));
    setMensagemResposta(null);
    setRequestError(null);
  };

  const salvarRespostaLivre = async (questionId: string) => {
    setMensagemResposta(null);
    setRequestError(null);
    try {
      const savedAnswer = await answerQuestionMutation.mutateAsync({ questionId, answer: respostasLivres[questionId] ?? "" });
      setRespostasLivres((current) => ({ ...current, [questionId]: savedAnswer?.answer ?? respostasLivres[questionId] ?? "" }));
      await questionsQuery.refetch();
      setRespostasLivresAlteradas((current) => {
        const next = new Set(current);
        next.delete(questionId);
        return next;
      });
      setMensagemResposta("Resposta salva.");
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Erro ao salvar resposta.");
    }
  };

  const sincronizarJogos = async () => {
    setSyncMessage(null);
    setSyncError(null);
    try {
      const result = await syncWorldCupMutation.mutateAsync(undefined);
      const skippedPastMatchesMessage = result.skippedPastMatches
        ? ` ${result.skippedPastMatches} partida(s) passada(s) já encerrada(s) foram ignorada(s).`
        : "";
      setSyncMessage(`${result.matches} partidas atualizadas.${skippedPastMatchesMessage} Última atualização: ${new Date(result.syncedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}.`);
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Erro ao atualizar jogos.");
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-transparent">
      <PredictionEasterEggOverlay effect={predictionEasterEgg} />
      <PageShell wide className="space-y-6">
        <Card className="overflow-hidden border-primary/20 bg-primary text-primary-foreground shadow-lg">
          <CardContent className="grid gap-5 p-6 lg:grid-cols-[1fr_360px] lg:items-end">
            <div className="space-y-3">
              <Badge variant="secondary" className="w-fit">Meu bolão</Badge>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{bolaoSelecionado?.name ?? "Escolha um bolão"}</h1>
                <p className="mt-2 max-w-2xl text-sm text-primary-foreground/80">Organize seus palpites, acompanhe pontuação, responda perguntas e veja a classificação do bolão selecionado.</p>
              </div>
              {bolaoSelecionado ? <p className="text-sm text-primary-foreground/75">{pendentes} pendente(s) · {palpitesPreenchidos}/{jogos.length} preenchidos</p> : null}
            </div>
            <div className="space-y-3 rounded-xl bg-background/95 p-4 text-foreground shadow-sm">
              <label className="text-sm font-medium" htmlFor="bolao-select">Bolão</label>
              <select
                id="bolao-select"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={bolaoSelecionadoId ?? ""}
                onChange={(event) => selecionarBolao(event.target.value)}
              >
                <option value="" disabled>Selecione um bolão</option>
                {boloes.map((bolao) => <option key={bolao.id} value={bolao.id}>{bolao.name}</option>)}
              </select>
              <div className="flex flex-wrap gap-2">
                {bolaoSelecionadoId ? <Link to="/pool-results/$poolId" params={{ poolId: bolaoSelecionadoId }} className={cn(buttonVariants({ variant: "default" }), "flex-1")}>Resultados</Link> : null}
                <Link to="/pools" className={cn(buttonVariants({ variant: "outline" }), "flex-1")}>Bolões</Link>
              </div>
              {isAdmin ? (
                <div className="rounded-lg border bg-muted/40 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Atualização dos jogos</p>
                      <p className="text-xs text-muted-foreground">Última atualização: {lastSyncedLabel}</p>
                    </div>
                    <Button size="sm" onClick={() => void sincronizarJogos()} disabled={syncWorldCupMutation.isPending}>
                      {syncWorldCupMutation.isPending ? "Atualizando..." : "Atualizar jogos"}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
        <TermsAcceptance />
        {requestError ? <Alert variant="destructive"><AlertTitle>Não foi possível salvar</AlertTitle><AlertDescription>{requestError}</AlertDescription></Alert> : null}
        {syncMessage ? <Alert variant="success"><AlertTitle>Jogos atualizados</AlertTitle><AlertDescription>{syncMessage}</AlertDescription></Alert> : null}
        {syncError ? <Alert variant="destructive"><AlertTitle>Não foi possível atualizar jogos</AlertTitle><AlertDescription>{syncError}</AlertDescription></Alert> : null}
        <PendingHomeAlert
          missingTodayPredictions={missingTodayPredictions}
          missingTomorrowPredictions={missingTomorrowPredictions}
          unansweredQuestions={perguntasSemResposta}
          onOpenPredictions={() => setViewMode("timeline")}
          onOpenQuestions={() => setViewMode("questions")}
        />
        {poolsQuery.status === "success" && !boloes.length ? <Alert variant="warning"><AlertTitle>Você ainda não está em um bolão</AlertTitle><AlertDescription>Entre em um bolão disponível para começar a palpitar.</AlertDescription></Alert> : null}
        {poolsQuery.status === "pending" || predictionsQuery.status === "pending" || questionsQuery.status === "pending" || rankingQuery.status === "pending" ? <Alert variant="info"><AlertTitle>Carregando painel</AlertTitle><AlertDescription>Buscando bolões, partidas, perguntas, ranking e palpites salvos.</AlertDescription></Alert> : null}
        {predictionsQuery.status === "error" ? <Alert variant="destructive"><AlertTitle>Erro ao carregar partidas</AlertTitle><AlertDescription>{predictionsQuery.error?.message || "Não foi possível carregar os dados."}</AlertDescription></Alert> : null}
        {questionsQuery.status === "error" ? <Alert variant="destructive"><AlertTitle>Erro ao carregar perguntas</AlertTitle><AlertDescription>{questionsQuery.error?.message || "Não foi possível carregar as perguntas."}</AlertDescription></Alert> : null}
        {rankingQuery.status === "error" ? <Alert variant="destructive"><AlertTitle>Erro ao carregar ranking</AlertTitle><AlertDescription>{rankingQuery.error?.message || "Não foi possível carregar sua pontuação."}</AlertDescription></Alert> : null}

        {boloes.length ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Metric label="Pontos" value={userScore?.points ?? 0} />
            <Metric label="Posição" value={userScore ? userRankingIndex + 1 : 0} />
            <Metric label="Placares exatos" value={userScore?.exactScores ?? 0} />
            <Metric label="Resultados" value={userScore?.correctOutcomes ?? 0} />
            <Metric label="Perguntas" value={userScore?.questionPoints ?? 0} />
          </section>
        ) : null}

        {predictionsQuery.status !== "pending" && !jogos.length ? <Alert variant="warning"><AlertTitle>Nenhuma partida importada</AlertTitle><AlertDescription>Importe a Copa do Mundo 2026 e crie um bolão ligado a esse torneio antes de registrar palpites.</AlertDescription></Alert> : null}
        {jogos.length || perguntasLivresVisiveis.length ? <NavigationPanel viewMode={viewMode} statusFilter={statusFilter} setViewMode={setViewMode} setStatusFilter={setStatusFilter} palpitesPreenchidos={palpitesPreenchidos} totalJogos={jogos.length} pendentes={pendentes} bloqueados={bloqueados} encerrados={encerrados} jogosHoje={jogosHoje} jogosSemPontuacao={jogosSemPontuacao} perguntasSemResposta={perguntasSemResposta} /> : null}

        {jogos.length && viewMode === "groups" ? <GroupedMatches jogos={jogos} palpites={palpitesLocais} saveStatuses={saveStatuses} onUpdate={atualizarPalpite} onCompare={setSelectedComparisonMatchId} /> : null}
        {jogos.length && viewMode === "list" ? <ListMatches jogos={jogosFiltrados} palpites={palpitesLocais} saveStatuses={saveStatuses} onUpdate={atualizarPalpite} onCompare={setSelectedComparisonMatchId} /> : null}
        {jogos.length && viewMode === "timeline" ? <TimelineMatches jogos={jogos} palpites={palpitesLocais} saveStatuses={saveStatuses} onUpdate={atualizarPalpite} onCompare={setSelectedComparisonMatchId} /> : null}
        {viewMode === "questions" ? <FreeQuestions perguntas={perguntasLivresVisiveis} respostasLivres={respostasLivres} mensagemResposta={mensagemResposta} answerQuestionPending={answerQuestionMutation.isPending} onAnswerChange={atualizarRespostaLivre} onSave={salvarRespostaLivre} onCompare={setSelectedComparisonQuestionId} /> : null}
        {selectedComparisonMatchId ? <ComparisonModal data={comparisonQuery.data} status={comparisonQuery.status} error={comparisonQuery.error} onClose={() => setSelectedComparisonMatchId(null)} /> : null}
        {selectedComparisonQuestionId ? <QuestionComparisonModal data={questionComparisonQuery.data} status={questionComparisonQuery.status} error={questionComparisonQuery.error} onClose={() => setSelectedComparisonQuestionId(null)} /> : null}
      </PageShell>
    </div>
  );
}

function PredictionEasterEggOverlay({ effect }: { effect: PredictionEasterEgg }) {
  useEffect(() => {
    if (!effect) return;

    const audioSrc = effect.variant === "canarinho"
      ? "/aqui-e-o-brasil.mp3"
      : effect.variant === "cr7"
        ? "/cr7-siuu.mp3"
      : effect.variant === "germany-audio"
        ? "/among-us-role-reveal-sound.mp3"
      : effect.variant === "mexico-loss"
        ? "/tema-triste-chaves.mp3"
      : effect.variant === "south-korea-win"
        ? "/soda-pop-kpop-demon-hunters-saja-boys-mp3.mp3"
      : effect.variant === "spain-win"
        ? "/espanha.mp3"
      : effect.variant === "france-win"
        ? "/french-music.mp3"
      : effect.variant === "colombia-win"
        ? "/waka-fifa.mp3"
      : effect.variant === "memphis"
        ? "/tu-tu-tu-du-max-verstappen.mp3"
      : effect.variant === "usa-loss"
        ? "/i_dont_remember_asking.mp3"
        : effect.variant === "japan-loss"
          ? "/musica-mais-triste-do-naruto-mp3cut.mp3"
          : null;
    if (!audioSrc) return;

    const audio = new Audio(audioSrc);
    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
  }, [effect]);

  if (!effect) return null;

  const imageSrc = effect.variant === "canarinho"
    ? "/canarinho.png"
    : effect.variant === "tsubasa"
      ? "/tsubasa.png"
      : effect.variant === "cr7"
        ? "/cr7.png"
        : effect.variant === "memphis"
          ? "/memphis.png"
        : null;

  if (!imageSrc) return null;

  const imageClassName = effect.variant === "cr7"
    ? "absolute top-0 left-0 w-[min(55vw,520px)] animate-[cr7-slide_1.15s_linear_forwards] select-none drop-shadow-2xl will-change-transform"
    : effect.variant === "memphis"
      ? "absolute top-0 left-0 w-[min(52vw,500px)] animate-[memphis-slide_2.4s_linear_forwards] select-none drop-shadow-2xl will-change-transform"
    : "absolute top-[90%] w-[min(88vw,720px)] -translate-y-1/2 animate-[canarinho-slide_7.2s_ease-in-out_forwards] select-none drop-shadow-2xl";

  return createPortal(
    <div key={effect.key} className="pointer-events-none fixed inset-0 z-[1000] overflow-hidden">
      <img src={imageSrc} alt="" aria-hidden="true" className={imageClassName} />
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

        @keyframes cr7-slide {
          0% {
            opacity: 0;
            transform: translate(105vw, 105vh) rotate(12deg) scale(0.92);
          }
          10% {
            opacity: 1;
          }
          100% {
            opacity: 1;
            transform: translate(-120%, -25vh) rotate(-8deg) scale(1.04);
          }
        }

        @keyframes memphis-slide {
          0% {
            opacity: 0;
            transform: translate(105vw, 100vh) rotate(10deg) scale(0.9);
          }
          10% {
            opacity: 1;
          }
          85% {
            opacity: 1;
          }
          100% {
            opacity: 0.98;
            transform: translate(-120%, -18vh) rotate(-6deg) scale(1.02);
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
    const todayIndex = Math.max(0, days.indexOf(todayKey));
    didInitialScrollRef.current = true;
    setActiveDayIndex(todayIndex);
    window.requestAnimationFrame(() => {
      containerRef.current?.scrollTo({ left: todayIndex * timelineColumnStep });
    });
  }, [days, todayKey]);

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

export function ComparisonModal({ data, status, error, onClose }: { data: ReturnType<typeof usePredictionMatchComparisonQuery>["data"]; status: string; error: Error | null; onClose: () => void }) {
  const homeTeamName = data?.match.homeTeamLabel ?? data?.match.homeTeam ?? "";
  const awayTeamName = data?.match.awayTeamLabel ?? data?.match.awayTeam ?? "";

  return (
    <ModalShell onClose={onClose} className="max-w-4xl">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Comparação do jogo</CardTitle>
            {data ? (
              <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                <TeamNameWithFlag emoji={data.match.homeTeamEmoji} name={homeTeamName} />
                <span className="text-muted-foreground">x</span>
                <TeamNameWithFlag emoji={data.match.awayTeamEmoji} name={awayTeamName} />
              </div>
            ) : null}
            <p className="text-sm text-muted-foreground">Palpites dos participantes ficam visíveis após o início do jogo.</p>
          </div>
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
              <Metric label={<TeamNameWithFlag emoji={data.match.homeTeamEmoji} name={homeTeamName} />} value={data.distribution.homeWinCount} />
              <Metric label="Empate" value={data.distribution.drawCount} />
              <Metric label={<TeamNameWithFlag emoji={data.match.awayTeamEmoji} name={awayTeamName} />} value={data.distribution.awayWinCount} />
              <Metric label="Mesmo palpite" value={data.distribution.sameAsCurrentUserCount} />
            </div>
            <div className="space-y-2">
              {data.participants.map((participant) => (
                <div key={participant.userId} className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 ${participant.isCurrentUser ? "border-primary bg-primary/5" : ""}`}>
                  <div><p className="font-medium">{participant.name}{participant.isCurrentUser ? " (você)" : ""}</p><p className="text-xs text-muted-foreground">{participant.email}</p></div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={participant.hasPrediction ? "default" : "secondary"}>
                      {participant.hasPrediction ? (
                        <span className="inline-flex items-center gap-1">
                          <TeamFlag emoji={data.match.homeTeamEmoji} name={homeTeamName} />
                          <span>{participant.homeGoals} x {participant.awayGoals}</span>
                          <TeamFlag emoji={data.match.awayTeamEmoji} name={awayTeamName} />
                        </span>
                      ) : "Sem palpite visível"}
                    </Badge>
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

export function QuestionComparisonModal({ data, status, error, onClose }: { data: ReturnType<typeof usePoolQuestionComparisonQuery>["data"]; status: string; error: Error | null; onClose: () => void }) {
  return (
    <ModalShell onClose={onClose} className="max-w-4xl">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><CardTitle>Comparação da pergunta</CardTitle><p className="mt-1 text-sm text-muted-foreground">As respostas dos outros participantes só aparecem depois que o prazo encerra.</p></div>
          <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === "pending" ? <Alert variant="info"><AlertTitle>Carregando comparação</AlertTitle><AlertDescription>Buscando respostas e status de correção por participante.</AlertDescription></Alert> : null}
        {status === "error" ? <Alert variant="destructive"><AlertTitle>Erro ao comparar</AlertTitle><AlertDescription>{error?.message ?? "Não foi possível carregar a comparação."}</AlertDescription></Alert> : null}
        {data ? (
          <>
            {!data.canCompare ? <Alert variant="warning"><AlertTitle>Comparação bloqueada</AlertTitle><AlertDescription>Antes do prazo encerrar, apenas a sua própria resposta fica visível.</AlertDescription></Alert> : null}
            <div className="grid gap-3 md:grid-cols-4">
              <Metric label="Responderam" value={data.distribution.answeredCount} />
              <Metric label="Sem resposta" value={data.distribution.missingCount} />
              <Metric label="Mesmo texto" value={data.distribution.sameAsCurrentUserCount} />
              <Metric label="Corretas" value={data.distribution.correctCount} />
            </div>
            <div className="space-y-2">
              {data.participants.map((participant) => (
                <div key={participant.userId} className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 ${participant.isCurrentUser ? "border-primary bg-primary/5" : ""}`}>
                  <div><p className="font-medium">{participant.name}{participant.isCurrentUser ? " (você)" : ""}</p><p className="text-xs text-muted-foreground">{participant.email}</p></div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Badge variant={participant.hasAnswer ? "default" : "secondary"}>{participant.showAnswer ? participant.answer?.trim() || "Sem resposta" : "Resposta oculta"}</Badge>
                    <Badge variant={participant.isCorrect === null ? "outline" : participant.isCorrect ? "success" : "destructive"}>
                      {participant.isCorrect === null ? "Pendente" : participant.isCorrect ? `${participant.points} pts` : "0 pts"}
                    </Badge>
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

function TeamNameWithFlag({ emoji, name }: { emoji: string | null | undefined; name: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <TeamFlag emoji={emoji} name={name} />
      <span className="truncate">{formatTeamNamePtBr(name)}</span>
    </span>
  );
}

function Metric({ label, value, compact = false }: { label: ReactNode; value: number; compact?: boolean }) {
  return <div className={`rounded-lg border border-accent bg-accent text-accent-foreground shadow-sm ${compact ? "p-2" : "p-3"}`}><p className="text-xs text-accent-foreground/70">{label}</p><p className={compact ? "text-lg font-semibold" : "text-2xl font-semibold"}>{value}</p></div>;
}
