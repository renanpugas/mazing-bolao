import { createFileRoute } from "@tanstack/react-router";
import { Check, Eye, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PageHeader, PageShell } from "@/components/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePoolQuestionAnswersQuery, useCreatePoolQuestionMutation, usePoolQuestionsListQuery, useReviewPoolQuestionAnswerMutation } from "@/hooks/use-pool-questions-api";
import { usePoolsListQuery } from "@/hooks/use-pools-api";
import { useSessionQuery } from "@/hooks/use-session-api";

export const Route = createFileRoute("/questions")({ component: QuestionsPage });

const WORLD_CUP_2026_FINAL_DEADLINE = "2026-07-19T22:00";

function QuestionsPage() {
  const sessionQuery = useSessionQuery();
  const isAdmin = !!sessionQuery.data?.user.isAdmin;
  const canManage = isAdmin;
  const poolsQuery = usePoolsListQuery({ enabled: canManage });
  const pools = poolsQuery.data ?? [];
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const questionsQuery = usePoolQuestionsListQuery(selectedPoolId);
  const createQuestionMutation = useCreatePoolQuestionMutation(selectedPoolId);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const answersQuery = usePoolQuestionAnswersQuery(selectedQuestionId);
  const reviewMutation = useReviewPoolQuestionAnswerMutation(selectedQuestionId);
  const [newQuestion, setNewQuestion] = useState("");
  const [newPoints, setNewPoints] = useState(1);
  const [newClosesAt, setNewClosesAt] = useState(WORLD_CUP_2026_FINAL_DEADLINE);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedPoolId && pools[0]) setSelectedPoolId(pools[0].id);
  }, [selectedPoolId, pools]);

  const selectedQuestion = useMemo(() => (questionsQuery.data ?? []).find((question) => question.id === selectedQuestionId), [questionsQuery.data, selectedQuestionId]);

  const selectPool = (poolId: string) => {
    setSelectedPoolId(poolId);
    setSelectedQuestionId(null);
    setSuccessMessage(null);
    setRequestError(null);
  };

  const createQuestion = async () => {
    if (!selectedPoolId) return;
    setSuccessMessage(null);
    setRequestError(null);
    try {
      await createQuestionMutation.mutateAsync({
        poolId: selectedPoolId,
        question: newQuestion,
        points: newPoints,
        closesAt: new Date(newClosesAt),
      });
      setNewQuestion("");
      setNewPoints(1);
      setNewClosesAt(WORLD_CUP_2026_FINAL_DEADLINE);
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

  return (
    <div className="min-h-[calc(100vh-64px)] bg-transparent">
      <PageShell className="space-y-6">
        <PageHeader title="Perguntas" description="Crie perguntas livres do bolão e corrija respostas quando você for administrador." />

        {successMessage ? <Alert variant="success"><AlertDescription>{successMessage}</AlertDescription></Alert> : null}
        {requestError ? <Alert variant="destructive"><AlertTitle>Não foi possível continuar</AlertTitle><AlertDescription>{requestError}</AlertDescription></Alert> : null}

        {sessionQuery.status === "pending" ? <Alert variant="info"><AlertTitle>Verificando permissões</AlertTitle><AlertDescription>Carregando sua sessão.</AlertDescription></Alert> : null}
        {sessionQuery.status === "success" && !canManage ? <Alert variant="warning"><AlertTitle>Acesso restrito</AlertTitle><AlertDescription>Somente administradores podem cadastrar ou editar perguntas.</AlertDescription></Alert> : null}

        {canManage ? <Card className="bg-card/80 backdrop-blur-sm">
          <CardContent className="space-y-3 pt-6">
            <p className="text-sm font-medium">Selecione o bolão</p>
            <div className="flex flex-wrap gap-2">
              {pools.map((pool) => <Button key={pool.id} variant={pool.id === selectedPoolId ? "default" : "soft"} onClick={() => selectPool(pool.id)}>{pool.name}</Button>)}
            </div>
          </CardContent>
        </Card> : null}

        {canManage && (poolsQuery.status === "pending" || questionsQuery.status === "pending") ? <Alert variant="info"><AlertTitle>Carregando perguntas</AlertTitle><AlertDescription>Buscando bolões e perguntas cadastradas.</AlertDescription></Alert> : null}
        {canManage && questionsQuery.status === "error" ? <Alert variant="destructive"><AlertTitle>Erro ao carregar perguntas</AlertTitle><AlertDescription>{questionsQuery.error?.message || "Não foi possível carregar as perguntas."}</AlertDescription></Alert> : null}

        {canManage ? (
          <Card className="bg-card/80 backdrop-blur-sm">
            <CardHeader><CardTitle>Criar pergunta</CardTitle></CardHeader>
            <CardContent className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="question">Pergunta</Label>
                <Textarea id="question" value={newQuestion} onChange={(event) => setNewQuestion(event.target.value)} placeholder="Ex.: Quem será o artilheiro da rodada?" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="points">Pontos</Label>
                <Input id="points" type="number" min={1} step={1} value={newPoints} onChange={(event) => setNewPoints(Number(event.target.value))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="closesAt">Prazo</Label>
                <Input id="closesAt" type="datetime-local" value={newClosesAt} onChange={(event) => setNewClosesAt(event.target.value)} />
              </div>
              <Button className="w-fit gap-2" disabled={!newQuestion.trim() || createQuestionMutation.isPending} onClick={() => void createQuestion()}><Plus className="size-4" />Criar</Button>
            </CardContent>
          </Card>
        ) : null}

        {canManage && questionsQuery.status === "success" && !(questionsQuery.data ?? []).length ? <Alert variant="warning"><AlertTitle>Nenhuma pergunta</AlertTitle><AlertDescription>Este bolão ainda não tem perguntas cadastradas.</AlertDescription></Alert> : null}

        {canManage ? <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            {(questionsQuery.data ?? []).map((question) => {
              const closesAt = new Date(question.closesAt);
              const closed = closesAt <= new Date();
              const reviewed = question.answer?.isCorrect !== null && question.answer?.isCorrect !== undefined;
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
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm text-muted-foreground">{reviewed ? `Sua resposta foi corrigida como ${question.answer?.isCorrect ? "correta" : "errada"}` : closed ? "Prazo encerrado para respostas" : "Aberta para respostas em Palpites"}</p>
                      {canManage ? <Button className="gap-2" variant={selectedQuestionId === question.id ? "secondary" : "outline"} onClick={() => setSelectedQuestionId(question.id)}><Eye className="size-4" />Respostas</Button> : null}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {canManage ? (
            <Card className="h-fit bg-card/80 backdrop-blur-sm">
              <CardHeader><CardTitle>Correção</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {!selectedQuestion ? <p className="text-sm text-muted-foreground">Selecione uma pergunta para ver as respostas.</p> : null}
                {selectedQuestion ? <p className="text-sm font-medium">{selectedQuestion.question}</p> : null}
                {answersQuery.status === "pending" && selectedQuestion ? <p className="text-sm text-muted-foreground">Carregando respostas...</p> : null}
                {answersQuery.status === "success" && !answersQuery.data.length ? <p className="text-sm text-muted-foreground">Nenhuma resposta enviada.</p> : null}
                {(answersQuery.data ?? []).map((answer) => (
                  <div key={answer.id} className="space-y-3 rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">{answer.user.name}</p>
                      <p className="text-xs text-muted-foreground">{answer.user.email}</p>
                    </div>
                    <p className="text-sm">{answer.answer}</p>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge variant={answer.isCorrect === null ? "outline" : answer.isCorrect ? "default" : "destructive"}>{answer.isCorrect === null ? "Pendente" : answer.isCorrect ? "Correta" : "Errada"}</Badge>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="gap-1" disabled={reviewMutation.isPending} onClick={() => void reviewAnswer(answer.id, true)}><Check className="size-4" />Correta</Button>
                        <Button size="sm" variant="outline" className="gap-1" disabled={reviewMutation.isPending} onClick={() => void reviewAnswer(answer.id, false)}><X className="size-4" />Errada</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div> : null}
      </PageShell>
    </div>
  );
}
