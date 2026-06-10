import { createFileRoute } from "@tanstack/react-router";
import { Check, Eye, Plus, RefreshCw, RotateCcw, Save, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PageHeader, PageShell } from "@/components/page-shell";
import { MatchTime } from "@/components/match-time";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useMatchOddsListQuery, useSyncMissingMatchOddsIdsMutation, useUpdateMatchOddsMutation } from "@/hooks/use-match-odds-api";
import { usePoolQuestionAnswersQuery, useCreatePoolQuestionMutation, usePoolQuestionsListQuery, useReviewPoolQuestionAnswerMutation, useUpdatePoolQuestionMutation } from "@/hooks/use-pool-questions-api";
import { usePoolScoringConfigQuery, usePoolScoringRankingQuery, useUpdatePoolScoringConfigMutation } from "@/hooks/use-pool-scoring-api";
import { useAddPoolParticipantMutation, usePoolParticipantsQuery, usePoolsListQuery, useRemovePoolParticipantMutation, useUpdatePoolMutation } from "@/hooks/use-pools-api";

export const Route = createFileRoute("/pools/$poolId")({ component: PoolDetailsPage });

type Tab = "general" | "participants" | "odds" | "scoring" | "questions";
type ScoringStage = "group" | "round_of_32" | "round_of_16" | "quarter_final" | "semi_final" | "third_place" | "final";
type ScoringRule = { stage: ScoringStage; label: string; exactScorePoints: number; outcomePoints: number; brazilMultiplier: number };
type OddBonusRule = { oddThreshold: number; bonusPercent: number };
type QuestionEdit = { question: string; points: number; closesAt: string };

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "general", label: "Geral" },
  { id: "participants", label: "Participantes" },
  { id: "odds", label: "Odds" },
  { id: "scoring", label: "Pontuação" },
  { id: "questions", label: "Perguntas" },
];

const worldCup2026FinalDeadline = "2026-07-19T22:00";

function PoolDetailsPage() {
  const { poolId } = Route.useParams();
  const poolsQuery = usePoolsListQuery();
  const pool = (poolsQuery.data ?? []).find((item) => item.id === poolId);
  const configQuery = usePoolScoringConfigQuery(poolId);
  const canManage = !!configQuery.data?.canManage;
  const [activeTab, setActiveTab] = useState<Tab>("general");

  return (
    <PageShell wide className="space-y-6">
      <PageHeader title={pool ? pool.name : "Bolão"} description={pool?.tournamentName ? `Configurações do bolão · ${pool.tournamentName}` : "Configurações do bolão"} />

      {poolsQuery.status === "pending" || configQuery.status === "pending" ? <Alert variant="info"><AlertTitle>Carregando bolão</AlertTitle><AlertDescription>Buscando dados e permissões.</AlertDescription></Alert> : null}
      {poolsQuery.status === "error" ? <Alert variant="destructive"><AlertTitle>Erro ao carregar bolão</AlertTitle><AlertDescription>{poolsQuery.error?.message || "Não foi possível carregar os bolões."}</AlertDescription></Alert> : null}
      {configQuery.status === "error" ? <Alert variant="destructive"><AlertTitle>Acesso indisponível</AlertTitle><AlertDescription>{configQuery.error?.message || "Não foi possível carregar a configuração."}</AlertDescription></Alert> : null}

      <Card className="bg-card/80 backdrop-blur-sm">
        <CardContent className="flex flex-wrap gap-2 pt-6">
          {tabs.map((tab) => <Button key={tab.id} variant={activeTab === tab.id ? "default" : "soft"} onClick={() => setActiveTab(tab.id)}>{tab.label}</Button>)}
        </CardContent>
      </Card>

      {activeTab === "general" ? <PoolGeneral poolId={poolId} pool={pool} canManage={canManage} /> : null}
      {activeTab === "participants" ? <PoolParticipants poolId={poolId} canManage={canManage} /> : null}
      {activeTab === "odds" ? <PoolOdds poolId={poolId} canManage={canManage} /> : null}
      {activeTab === "scoring" ? <PoolScoring poolId={poolId} /> : null}
      {activeTab === "questions" ? <PoolQuestionsAdmin poolId={poolId} canManage={canManage} /> : null}
    </PageShell>
  );
}

function PoolGeneral({ poolId, pool, canManage }: { poolId: string; pool?: { id: string; name: string; tournamentName: string | null; createdAt: Date | string }; canManage: boolean }) {
  const updatePoolMutation = useUpdatePoolMutation();
  const [name, setName] = useState(pool?.name ?? "");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  useEffect(() => setName(pool?.name ?? ""), [pool?.name]);

  const save = async () => {
    setSuccessMessage(null);
    setRequestError(null);
    try {
      await updatePoolMutation.mutateAsync({ id: poolId, name: name.trim() });
      setSuccessMessage("Dados do bolão salvos.");
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Erro ao salvar bolão.");
    }
  };

  return (
    <Card className="bg-card/80 backdrop-blur-sm">
      <CardHeader><CardTitle>Dados gerais</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {successMessage ? <Alert variant="success"><AlertDescription>{successMessage}</AlertDescription></Alert> : null}
        {requestError ? <Alert variant="destructive"><AlertTitle>Não foi possível salvar</AlertTitle><AlertDescription>{requestError}</AlertDescription></Alert> : null}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2"><Label>Nome</Label><Input value={name} disabled={!canManage} onChange={(event) => setName(event.target.value)} /></div>
          <div className="space-y-2"><Label>Torneio</Label><Input value={pool?.tournamentName ?? "Sem torneio"} disabled /></div>
        </div>
        <p className="text-sm text-muted-foreground">Criado em: {pool ? new Date(pool.createdAt).toLocaleString("pt-BR") : "-"}</p>
        {canManage ? <Button className="gap-2" disabled={!name.trim() || updatePoolMutation.isPending} onClick={() => void save()}><Save className="size-4" />Salvar</Button> : <Badge variant="secondary">Somente leitura</Badge>}
      </CardContent>
    </Card>
  );
}

function PoolParticipants({ poolId, canManage }: { poolId: string; canManage: boolean }) {
  const participantsQuery = usePoolParticipantsQuery(poolId);
  const rankingQuery = usePoolScoringRankingQuery(poolId);
  const addMutation = useAddPoolParticipantMutation(poolId);
  const removeMutation = useRemovePoolParticipantMutation(poolId);
  const [email, setEmail] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const rankingByUser = new Map((rankingQuery.data ?? []).map((entry) => [entry.userId, entry]));

  const addParticipant = async () => {
    setSuccessMessage(null);
    setRequestError(null);
    try {
      await addMutation.mutateAsync({ poolId, email });
      setEmail("");
      setSuccessMessage("Participante adicionado.");
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Erro ao adicionar participante.");
    }
  };

  const removeParticipant = async (userId: string) => {
    setSuccessMessage(null);
    setRequestError(null);
    try {
      await removeMutation.mutateAsync({ poolId, userId });
      setSuccessMessage("Participante removido.");
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Erro ao remover participante.");
    }
  };

  return (
    <div className="space-y-4">
      {successMessage ? <Alert variant="success"><AlertDescription>{successMessage}</AlertDescription></Alert> : null}
      {requestError ? <Alert variant="destructive"><AlertTitle>Não foi possível continuar</AlertTitle><AlertDescription>{requestError}</AlertDescription></Alert> : null}
      {participantsQuery.status === "pending" || rankingQuery.status === "pending" ? <Alert variant="info"><AlertDescription>Carregando participantes.</AlertDescription></Alert> : null}
      {participantsQuery.status === "error" ? <Alert variant="destructive"><AlertTitle>Erro ao carregar participantes</AlertTitle><AlertDescription>{participantsQuery.error?.message || "Não foi possível carregar os participantes."}</AlertDescription></Alert> : null}

      {canManage ? (
        <Card className="bg-card/80 backdrop-blur-sm">
          <CardHeader><CardTitle>Adicionar participante</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1 space-y-2"><Label>E-mail do usuário</Label><Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="participante@email.com" /></div>
            <Button disabled={!email.trim() || addMutation.isPending} onClick={() => void addParticipant()}>Adicionar</Button>
          </CardContent>
        </Card>
      ) : null}

      <Card className="bg-card/80 backdrop-blur-sm">
        <CardHeader><CardTitle>Participantes</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>E-mail</TableHead><TableHead>Pontos</TableHead><TableHead>Entrada</TableHead>{canManage ? <TableHead className="w-24">Ação</TableHead> : null}</TableRow></TableHeader>
            <TableBody>
              {(participantsQuery.data?.participants ?? []).map((participant) => {
                const ranking = rankingByUser.get(participant.userId);
                return (
                  <TableRow key={participant.id}>
                    <TableCell className="font-medium">{participant.user.name}</TableCell>
                    <TableCell>{participant.user.email}</TableCell>
                    <TableCell>{ranking?.points ?? 0}</TableCell>
                    <TableCell>{new Date(participant.createdAt).toLocaleString("pt-BR")}</TableCell>
                    {canManage ? <TableCell><Button variant="ghost" size="sm" disabled={removeMutation.isPending} onClick={() => void removeParticipant(participant.userId)}>Remover</Button></TableCell> : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function PoolOdds({ poolId, canManage }: { poolId: string; canManage: boolean }) {
  const oddsQuery = useMatchOddsListQuery(poolId);
  const updateOddsMutation = useUpdateMatchOddsMutation(poolId);
  const syncMissingIdsMutation = useSyncMissingMatchOddsIdsMutation(poolId);
  const [updatingMatchId, setUpdatingMatchId] = useState<string | null>(null);
  const [successMatchId, setSuccessMatchId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ matchId: string; message: string } | null>(null);
  const [syncResult, setSyncResult] = useState<{ updatedCount: number; unmatchedCount: number; skippedExistingIdCount: number } | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const updateOdds = async (matchId: string) => {
    setUpdatingMatchId(matchId);
    setSuccessMatchId(null);
    setRowError(null);
    try {
      await updateOddsMutation.mutateAsync({ poolId, matchId });
      setSuccessMatchId(matchId);
      await oddsQuery.refetch();
    } catch (error) {
      setRowError({ matchId, message: error instanceof Error ? error.message : "Erro ao atualizar odds." });
    } finally {
      setUpdatingMatchId(null);
    }
  };

  const syncMissingIds = async () => {
    setSyncResult(null);
    setSyncError(null);
    try {
      const result = await syncMissingIdsMutation.mutateAsync({ poolId });
      setSyncResult(result);
      await oddsQuery.refetch();
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Erro ao sincronizar partidas sem id.");
    }
  };

  if (!canManage) return <Alert variant="warning"><AlertTitle>Acesso restrito</AlertTitle><AlertDescription>Somente administradores podem editar odds.</AlertDescription></Alert>;

  return (
    <div className="space-y-4">
      <Card className="bg-card/80 backdrop-blur-sm"><CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6"><p className="text-sm text-muted-foreground">Atualize odds das partidas do torneio vinculado.</p><Button className="gap-2" variant="secondary" disabled={syncMissingIdsMutation.isPending} onClick={() => void syncMissingIds()}><RefreshCw className={`size-4 ${syncMissingIdsMutation.isPending ? "animate-spin" : ""}`} />Sincronizar partidas sem id</Button></CardContent></Card>
      {syncResult ? <Alert variant="success"><AlertTitle>Sincronização concluída</AlertTitle><AlertDescription>{syncResult.updatedCount} atualizada(s), {syncResult.unmatchedCount} sem correspondência e {syncResult.skippedExistingIdCount} ignorada(s).</AlertDescription></Alert> : null}
      {syncError ? <Alert variant="destructive"><AlertTitle>Erro ao sincronizar</AlertTitle><AlertDescription>{syncError}</AlertDescription></Alert> : null}
      {oddsQuery.status === "pending" ? <Alert variant="info"><AlertDescription>Carregando partidas e odds.</AlertDescription></Alert> : null}
      {oddsQuery.status === "error" ? <Alert variant="destructive"><AlertTitle>Erro ao carregar partidas</AlertTitle><AlertDescription>{oddsQuery.error?.message || "Não foi possível carregar as partidas."}</AlertDescription></Alert> : null}
      {oddsQuery.status === "success" && !oddsQuery.data.length ? <Alert variant="warning"><AlertTitle>Nenhuma partida</AlertTitle><AlertDescription>O torneio desse bolão ainda não tem partidas cadastradas.</AlertDescription></Alert> : null}
      {oddsQuery.data?.length ? (
        <Card className="bg-card/80 backdrop-blur-sm"><CardContent className="pt-6"><Table><TableHeader><TableRow><TableHead>Partida</TableHead><TableHead>Horário</TableHead><TableHead>Mandante</TableHead><TableHead>Empate</TableHead><TableHead>Visitante</TableHead><TableHead>Ação</TableHead></TableRow></TableHeader><TableBody>{oddsQuery.data.map((match) => {
          const isUpdating = updatingMatchId === match.id;
          return <TableRow key={match.id}><TableCell><div><p className="font-medium">{match.homeTeamLabel ?? match.homeTeam} x {match.awayTeamLabel ?? match.awayTeam}</p><p className="text-xs text-muted-foreground">{[match.stage, match.groupName].filter(Boolean).join(" · ") || "Partida"}</p></div></TableCell><TableCell><MatchTime startsAt={match.startsAt} startsAtTimeZone={match.startsAtTimeZone} /></TableCell><TableCell>{formatOdd(match.oddsHomeTeam)}</TableCell><TableCell>{formatOdd(match.oddsDraw)}</TableCell><TableCell>{formatOdd(match.oddsAwayTeam)}</TableCell><TableCell><Button className="gap-2" size="sm" disabled={!match.oddsApiMatchId || isUpdating} onClick={() => void updateOdds(match.id)}><RefreshCw className={`size-4 ${isUpdating ? "animate-spin" : ""}`} />{isUpdating ? "Atualizando" : match.oddsApiMatchId ? "Atualizar" : "Sem id"}</Button>{successMatchId === match.id ? <p className="text-xs text-emerald-600">Odds atualizadas.</p> : null}{rowError?.matchId === match.id ? <p className="text-xs text-destructive">{rowError.message}</p> : null}</TableCell></TableRow>;
        })}</TableBody></Table></CardContent></Card>
      ) : null}
    </div>
  );
}

function PoolScoring({ poolId }: { poolId: string }) {
  const configQuery = usePoolScoringConfigQuery(poolId);
  const updateConfigMutation = useUpdatePoolScoringConfigMutation(poolId);
  const [rules, setRules] = useState<ScoringRule[]>([]);
  const [oddBonusRules, setOddBonusRules] = useState<OddBonusRule[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const canManage = !!configQuery.data?.canManage;

  useEffect(() => { if (configQuery.data?.rules) setRules(configQuery.data.rules.map((rule) => ({ ...rule })) as ScoringRule[]); }, [configQuery.data?.rules]);
  useEffect(() => { if (configQuery.data?.oddBonusRules) setOddBonusRules(configQuery.data.oddBonusRules.map((rule) => ({ ...rule }))); }, [configQuery.data?.oddBonusRules]);

  const saveConfig = async () => {
    setSuccessMessage(null);
    setRequestError(null);
    try {
      await updateConfigMutation.mutateAsync({ poolId, rules: rules.map(({ stage, exactScorePoints, outcomePoints, brazilMultiplier }) => ({ stage, exactScorePoints, outcomePoints, brazilMultiplier })), oddBonusRules });
      setSuccessMessage("Configuração de pontuação salva.");
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Erro ao salvar configuração.");
    }
  };

  return (
    <div className="space-y-4">
      {successMessage ? <Alert variant="success"><AlertDescription>{successMessage}</AlertDescription></Alert> : null}
      {requestError ? <Alert variant="destructive"><AlertTitle>Não foi possível salvar</AlertTitle><AlertDescription>{requestError}</AlertDescription></Alert> : null}
      {configQuery.status === "pending" ? <Alert variant="info"><AlertDescription>Carregando regras de pontuação.</AlertDescription></Alert> : null}
      <Card className="bg-card/80 backdrop-blur-sm"><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>Regras por fase</CardTitle><p className="mt-1 text-sm text-muted-foreground">Configure placar exato, resultado e bônus do Brasil.</p></div><Badge variant={canManage ? "default" : "secondary"}>{canManage ? "Editável" : "Somente leitura"}</Badge></div></CardHeader><CardContent className="space-y-4"><Table><TableHeader><TableRow><TableHead>Fase</TableHead><TableHead>Placar exato</TableHead><TableHead>Resultado</TableHead><TableHead>Brasil</TableHead></TableRow></TableHeader><TableBody>{rules.map((rule) => <TableRow key={rule.stage}><TableCell className="font-medium">{rule.label}</TableCell><TableCell><Input className="w-24" type="number" min={0} disabled={!canManage} value={rule.exactScorePoints} onChange={(event) => setRules((current) => current.map((item) => item.stage === rule.stage ? { ...item, exactScorePoints: Number(event.target.value) } : item))} /></TableCell><TableCell><Input className="w-24" type="number" min={0} disabled={!canManage} value={rule.outcomePoints} onChange={(event) => setRules((current) => current.map((item) => item.stage === rule.stage ? { ...item, outcomePoints: Number(event.target.value) } : item))} /></TableCell><TableCell><label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={!canManage} checked={rule.brazilMultiplier > 1} onChange={(event) => setRules((current) => current.map((item) => item.stage === rule.stage ? { ...item, brazilMultiplier: event.target.checked ? 2 : 1 } : item))} />{rule.brazilMultiplier > 1 ? `dobra (${rule.brazilMultiplier}x)` : "sem bônus"}</label></TableCell></TableRow>)}</TableBody></Table>
        <div className="space-y-3 border-t pt-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-semibold">Bônus por odd</h3><p className="mt-1 text-sm text-muted-foreground">Soma bônus quando a odd vencedora passa da faixa.</p></div>{canManage ? <Button variant="outline" className="gap-2" onClick={() => setOddBonusRules((current) => [...current, { oddThreshold: Math.max(1, ...current.map((rule) => rule.oddThreshold)) + 1, bonusPercent: 50 }])}><Plus className="size-4" />Adicionar faixa</Button> : null}</div>{oddBonusRules.length ? <Table><TableHeader><TableRow><TableHead>Odd acima de</TableHead><TableHead>Bônus (%)</TableHead>{canManage ? <TableHead>Remover</TableHead> : null}</TableRow></TableHeader><TableBody>{oddBonusRules.map((rule, index) => <TableRow key={`${rule.oddThreshold}-${index}`}><TableCell><Input className="w-32" type="number" min={0.01} step={0.01} disabled={!canManage} value={rule.oddThreshold} onChange={(event) => setOddBonusRules((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, oddThreshold: Number(event.target.value) } : item))} /></TableCell><TableCell><Input className="w-32" type="number" min={0} disabled={!canManage} value={rule.bonusPercent} onChange={(event) => setOddBonusRules((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, bonusPercent: Number(event.target.value) } : item))} /></TableCell>{canManage ? <TableCell><Button variant="ghost" size="sm" onClick={() => setOddBonusRules((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="size-4" /></Button></TableCell> : null}</TableRow>)}</TableBody></Table> : <p className="text-sm text-muted-foreground">Nenhum bônus por odd configurado.</p>}</div>
        {canManage ? <div className="flex flex-wrap gap-2"><Button className="gap-2" onClick={() => void saveConfig()} disabled={updateConfigMutation.isPending}><Save className="size-4" />Salvar regras</Button><Button variant="outline" className="gap-2" onClick={() => { if (configQuery.data?.defaults) setRules(configQuery.data.defaults.map((rule) => ({ ...rule })) as ScoringRule[]); setOddBonusRules([]); }}><RotateCcw className="size-4" />Restaurar padrões</Button></div> : null}</CardContent></Card>
    </div>
  );
}

function PoolQuestionsAdmin({ poolId, canManage }: { poolId: string; canManage: boolean }) {
  const questionsQuery = usePoolQuestionsListQuery(poolId);
  const createQuestionMutation = useCreatePoolQuestionMutation(poolId);
  const updateQuestionMutation = useUpdatePoolQuestionMutation(poolId);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const answersQuery = usePoolQuestionAnswersQuery(selectedQuestionId);
  const reviewMutation = useReviewPoolQuestionAnswerMutation(selectedQuestionId);
  const [newQuestion, setNewQuestion] = useState("");
  const [newPoints, setNewPoints] = useState(1);
  const [newClosesAt, setNewClosesAt] = useState(worldCup2026FinalDeadline);
  const [questionEdits, setQuestionEdits] = useState<Record<string, QuestionEdit>>({});
  const [savingQuestionId, setSavingQuestionId] = useState<string | null>(null);
  const [savedQuestionId, setSavedQuestionId] = useState<string | null>(null);
  const [questionError, setQuestionError] = useState<{ questionId: string; message: string } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const selectedQuestion = useMemo(() => (questionsQuery.data ?? []).find((question) => question.id === selectedQuestionId), [questionsQuery.data, selectedQuestionId]);

  useEffect(() => {
    setQuestionEdits(
      (questionsQuery.data ?? []).reduce<Record<string, QuestionEdit>>((acc, question) => {
        acc[question.id] = {
          question: question.question,
          points: question.points,
          closesAt: toDateTimeLocalValue(question.closesAt),
        };
        return acc;
      }, {}),
    );
  }, [questionsQuery.data]);

  const createQuestion = async () => {
    setSuccessMessage(null);
    setRequestError(null);
    try {
      await createQuestionMutation.mutateAsync({ poolId, question: newQuestion, points: newPoints, closesAt: new Date(newClosesAt) });
      setNewQuestion("");
      setNewPoints(1);
      setNewClosesAt(worldCup2026FinalDeadline);
      setSuccessMessage("Pergunta criada.");
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Erro ao criar pergunta.");
    }
  };

  const reviewAnswer = async (answerId: string, isCorrect: boolean) => {
    setSuccessMessage(null);
    setRequestError(null);
    try {
      await reviewMutation.mutateAsync({ answerId, isCorrect });
      setSuccessMessage("Correção salva.");
      await questionsQuery.refetch();
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Erro ao corrigir resposta.");
    }
  };

  const updateQuestion = async (questionId: string) => {
    const edit = questionEdits[questionId];
    if (!edit) return;

    setSuccessMessage(null);
    setRequestError(null);
    setSavedQuestionId(null);
    setQuestionError(null);
    setSavingQuestionId(questionId);
    try {
      await updateQuestionMutation.mutateAsync({
        questionId,
        question: edit.question,
        points: edit.points,
        closesAt: new Date(edit.closesAt),
      });
      setSavedQuestionId(questionId);
      setSuccessMessage("Pergunta salva.");
      await questionsQuery.refetch();
    } catch (error) {
      setQuestionError({ questionId, message: error instanceof Error ? error.message : "Erro ao salvar pergunta." });
    } finally {
      setSavingQuestionId(null);
    }
  };

  if (!canManage) return <Alert variant="warning"><AlertTitle>Acesso restrito</AlertTitle><AlertDescription>Somente administradores podem cadastrar ou corrigir perguntas.</AlertDescription></Alert>;

  return (
    <div className="space-y-4">
      {successMessage ? <Alert variant="success"><AlertDescription>{successMessage}</AlertDescription></Alert> : null}
      {requestError ? <Alert variant="destructive"><AlertTitle>Não foi possível continuar</AlertTitle><AlertDescription>{requestError}</AlertDescription></Alert> : null}
      {questionsQuery.status === "pending" ? <Alert variant="info"><AlertDescription>Carregando perguntas.</AlertDescription></Alert> : null}
      {questionsQuery.status === "error" ? <Alert variant="destructive"><AlertTitle>Erro ao carregar perguntas</AlertTitle><AlertDescription>{questionsQuery.error?.message || "Não foi possível carregar as perguntas."}</AlertDescription></Alert> : null}
      <Card className="bg-card/80 backdrop-blur-sm"><CardHeader><CardTitle>Criar pergunta</CardTitle></CardHeader><CardContent className="grid gap-4"><div className="space-y-2"><Label>Pergunta</Label><Textarea value={newQuestion} onChange={(event) => setNewQuestion(event.target.value)} placeholder="Ex.: Quem será o artilheiro da rodada?" /></div><div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>Pontos</Label><Input type="number" min={1} value={newPoints} onChange={(event) => setNewPoints(Number(event.target.value))} /></div><div className="space-y-2"><Label>Prazo</Label><Input type="datetime-local" value={newClosesAt} onChange={(event) => setNewClosesAt(event.target.value)} /></div></div><Button className="w-fit gap-2" disabled={!newQuestion.trim() || createQuestionMutation.isPending} onClick={() => void createQuestion()}><Plus className="size-4" />Criar</Button></CardContent></Card>
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {(questionsQuery.data ?? []).map((question) => {
            const edit = questionEdits[question.id] ?? {
              question: question.question,
              points: question.points,
              closesAt: toDateTimeLocalValue(question.closesAt),
            };
            const closesAt = new Date(question.closesAt);
            const closed = closesAt <= new Date();
            const isSaving = savingQuestionId === question.id;
            const isInvalid = !edit.question.trim() || edit.points <= 0 || !edit.closesAt;

            return (
              <Card key={question.id} className="bg-card/80 backdrop-blur-sm">
                <CardHeader className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <CardTitle className="text-lg">{question.question}</CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={closed ? "secondary" : "default"}>{closed ? "Fechada" : "Aberta"}</Badge>
                      <Badge variant="outline">{question.points} ponto(s)</Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">Prazo: {closesAt.toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" })}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Pergunta</Label>
                    <Textarea
                      value={edit.question}
                      onChange={(event) => setQuestionEdits((current) => ({ ...current, [question.id]: { ...edit, question: event.target.value } }))}
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Pontos</Label>
                      <Input
                        type="number"
                        min={1}
                        value={edit.points}
                        onChange={(event) => setQuestionEdits((current) => ({ ...current, [question.id]: { ...edit, points: Number(event.target.value) } }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Prazo</Label>
                      <Input
                        type="datetime-local"
                        value={edit.closesAt}
                        onChange={(event) => setQuestionEdits((current) => ({ ...current, [question.id]: { ...edit, closesAt: event.target.value } }))}
                      />
                    </div>
                  </div>
                  {questionError?.questionId === question.id ? <p className="text-sm text-destructive">{questionError.message}</p> : null}
                  {savedQuestionId === question.id ? <p className="text-sm text-emerald-600">Pergunta salva.</p> : null}
                  <div className="flex flex-wrap gap-2">
                    <Button className="gap-2" disabled={isInvalid || isSaving || updateQuestionMutation.isPending} onClick={() => void updateQuestion(question.id)}>
                      <Save className="size-4" />{isSaving ? "Salvando" : "Salvar"}
                    </Button>
                    <Button className="gap-2" variant={selectedQuestionId === question.id ? "secondary" : "outline"} onClick={() => setSelectedQuestionId(question.id)}>
                      <Eye className="size-4" />Respostas
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <Card className="h-fit bg-card/80 backdrop-blur-sm"><CardHeader><CardTitle>Correção</CardTitle></CardHeader><CardContent className="space-y-4">{!selectedQuestion ? <p className="text-sm text-muted-foreground">Selecione uma pergunta para ver respostas.</p> : <p className="text-sm font-medium">{selectedQuestion.question}</p>}{answersQuery.status === "pending" && selectedQuestion ? <p className="text-sm text-muted-foreground">Carregando respostas...</p> : null}{answersQuery.status === "success" && !answersQuery.data.length ? <p className="text-sm text-muted-foreground">Nenhuma resposta enviada.</p> : null}{(answersQuery.data ?? []).map((answer) => <div key={answer.id} className="space-y-3 rounded-lg border p-3"><div><p className="text-sm font-medium">{answer.user.name}</p><p className="text-xs text-muted-foreground">{answer.user.email}</p></div><p className="text-sm">{answer.answer}</p><div className="flex flex-wrap items-center justify-between gap-2"><Badge variant={answer.isCorrect === null ? "outline" : answer.isCorrect ? "default" : "destructive"}>{answer.isCorrect === null ? "Pendente" : answer.isCorrect ? "Correta" : "Errada"}</Badge><div className="flex gap-2"><Button size="sm" variant="outline" className="gap-1" disabled={reviewMutation.isPending} onClick={() => void reviewAnswer(answer.id, true)}><Check className="size-4" />Correta</Button><Button size="sm" variant="outline" className="gap-1" disabled={reviewMutation.isPending} onClick={() => void reviewAnswer(answer.id, false)}><X className="size-4" />Errada</Button></div></div></div>)}</CardContent></Card>
      </div>
    </div>
  );
}

function toDateTimeLocalValue(value: Date | string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 16);
}

function formatOdd(value: number | null | undefined) {
  return typeof value === "number" ? value.toFixed(2) : "-";
}
