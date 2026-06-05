import { createFileRoute } from "@tanstack/react-router";
import { RotateCcw, Save } from "lucide-react";
import { useEffect, useState } from "react";

import { PageHeader, PageShell } from "@/components/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePoolQuestionScoresQuery, usePoolScoringConfigQuery, useUpdatePoolQuestionScoresMutation, useUpdatePoolScoringConfigMutation } from "@/hooks/use-pool-scoring-api";
import { usePoolsListQuery } from "@/hooks/use-pools-api";

type ScoringRule = {
  stage: "group" | "round_of_32" | "round_of_16" | "quarter_final" | "semi_final" | "third_place" | "final";
  label: string;
  exactScorePoints: number;
  outcomePoints: number;
  brazilMultiplier: number;
};

type QuestionScore = {
  id: string;
  question: string;
  points: number;
  closesAt: Date;
  createdAt: Date;
};

export const Route = createFileRoute("/scoring")({ component: ScoringPage });

function ScoringPage() {
  const poolsQuery = usePoolsListQuery();
  const pools = poolsQuery.data ?? [];
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const configQuery = usePoolScoringConfigQuery(selectedPoolId);
  const questionScoresQuery = usePoolQuestionScoresQuery(selectedPoolId);
  const updateConfigMutation = useUpdatePoolScoringConfigMutation(selectedPoolId);
  const updateQuestionScoresMutation = useUpdatePoolQuestionScoresMutation(selectedPoolId);
  const [rules, setRules] = useState<ScoringRule[]>([]);
  const [questionScores, setQuestionScores] = useState<QuestionScore[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedPoolId && pools[0]) setSelectedPoolId(pools[0].id);
  }, [selectedPoolId, pools]);

  useEffect(() => {
    if (configQuery.data?.rules) setRules(configQuery.data.rules.map((rule) => ({ ...rule })) as ScoringRule[]);
  }, [configQuery.data?.rules]);

  useEffect(() => {
    if (questionScoresQuery.data?.questions) setQuestionScores(questionScoresQuery.data.questions.map((question) => ({ ...question })));
  }, [questionScoresQuery.data?.questions]);

  const selectPool = (poolId: string) => {
    setSelectedPoolId(poolId);
    setSuccessMessage(null);
    setRequestError(null);
  };

  const updateRule = (stage: ScoringRule["stage"], field: "exactScorePoints" | "outcomePoints" | "brazilMultiplier", value: number) => {
    setRules((currentRules) => currentRules.map((rule) => (rule.stage === stage ? { ...rule, [field]: value } : rule)));
  };

  const updateQuestionScore = (questionId: string, points: number) => {
    setQuestionScores((currentQuestions) => currentQuestions.map((question) => (question.id === questionId ? { ...question, points } : question)));
  };

  const restoreDefaults = () => {
    if (configQuery.data?.defaults) setRules(configQuery.data.defaults.map((rule) => ({ ...rule })) as ScoringRule[]);
    setSuccessMessage(null);
    setRequestError(null);
  };

  const saveConfig = async () => {
    if (!selectedPoolId) return;
    setSuccessMessage(null);
    setRequestError(null);

    try {
      await updateConfigMutation.mutateAsync({
        poolId: selectedPoolId,
        rules: rules.map(({ stage, exactScorePoints, outcomePoints, brazilMultiplier }) => ({
          stage,
          exactScorePoints,
          outcomePoints,
          brazilMultiplier,
        })),
      });
      setSuccessMessage("Configuração de pontuação salva.");
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Erro ao salvar configuração.");
    }
  };

  const saveQuestionScores = async () => {
    if (!selectedPoolId) return;
    setSuccessMessage(null);
    setRequestError(null);

    try {
      await updateQuestionScoresMutation.mutateAsync({
        poolId: selectedPoolId,
        questions: questionScores.map(({ id, points }) => ({ id, points })),
      });
      setSuccessMessage("Pontuação das perguntas livres salva.");
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Erro ao salvar pontuação das perguntas.");
    }
  };

  const isOwner = !!configQuery.data?.isOwner;

  return (
    <PageShell className="space-y-6">
      <PageHeader title="Pontuação" description="Configure os pontos por fase para as partidas do bolão selecionado." />

      {successMessage ? <Alert variant="success"><AlertDescription>{successMessage}</AlertDescription></Alert> : null}
      {requestError ? <Alert variant="destructive"><AlertTitle>Não foi possível salvar</AlertTitle><AlertDescription>{requestError}</AlertDescription></Alert> : null}

      <Card className="bg-card/80 backdrop-blur-sm">
        <CardContent className="space-y-3 pt-6">
          <p className="text-sm font-medium">Selecione o bolão</p>
          <div className="flex flex-wrap gap-2">
            {pools.map((pool) => <Button key={pool.id} variant={pool.id === selectedPoolId ? "default" : "soft"} onClick={() => selectPool(pool.id)}>{pool.name}</Button>)}
          </div>
        </CardContent>
      </Card>

      {poolsQuery.status === "pending" || configQuery.status === "pending" || questionScoresQuery.status === "pending" ? <Alert variant="info"><AlertTitle>Carregando pontuação</AlertTitle><AlertDescription>Buscando bolões, regras de pontuação e perguntas livres.</AlertDescription></Alert> : null}
      {configQuery.status === "error" ? <Alert variant="destructive"><AlertTitle>Erro ao carregar configuração</AlertTitle><AlertDescription>{configQuery.error?.message || "Não foi possível carregar as regras."}</AlertDescription></Alert> : null}
      {questionScoresQuery.status === "error" ? <Alert variant="destructive"><AlertTitle>Erro ao carregar perguntas</AlertTitle><AlertDescription>{questionScoresQuery.error?.message || "Não foi possível carregar as perguntas livres."}</AlertDescription></Alert> : null}

      <Card className="bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Regras por fase</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Placar exato vale 100%; acerto de resultado, vencedor ou empate usa o valor parcial.</p>
            </div>
            <Badge variant={isOwner ? "default" : "secondary"}>{isOwner ? "Editável" : "Somente leitura"}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fase</TableHead>
                <TableHead>Placar exato</TableHead>
                <TableHead>Resultado/vencedor</TableHead>
                <TableHead>Jogo do Brasil</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.stage}>
                  <TableCell className="font-medium">{rule.label}</TableCell>
                  <TableCell><Input className="w-24" type="number" min={0} step={1} disabled={!isOwner} value={rule.exactScorePoints} onChange={(event) => updateRule(rule.stage, "exactScorePoints", Number(event.target.value))} /></TableCell>
                  <TableCell><Input className="w-24" type="number" min={0} step={1} disabled={!isOwner} value={rule.outcomePoints} onChange={(event) => updateRule(rule.stage, "outcomePoints", Number(event.target.value))} /></TableCell>
                  <TableCell>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" disabled={!isOwner} checked={rule.brazilMultiplier > 1} onChange={(event) => updateRule(rule.stage, "brazilMultiplier", event.target.checked ? 2 : 1)} />
                      {rule.brazilMultiplier > 1 ? `dobra (${rule.brazilMultiplier}x)` : "sem bônus"}
                    </label>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {isOwner ? (
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" className="gap-2" onClick={restoreDefaults}><RotateCcw className="size-4" />Restaurar padrão</Button>
              <Button className="gap-2" disabled={!rules.length || updateConfigMutation.isPending} onClick={() => void saveConfig()}><Save className="size-4" />Salvar configuração</Button>
            </div>
          ) : <p className="text-sm text-muted-foreground">Somente o criador do bolão pode alterar estas regras.</p>}
        </CardContent>
      </Card>

      <Card className="bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Perguntas livres</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Defina quantos pontos cada pergunta cadastrada vale quando a resposta for corrigida como correta.</p>
            </div>
            <Badge variant={isOwner ? "default" : "secondary"}>{isOwner ? "Editável" : "Somente leitura"}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {questionScores.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pergunta</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pontos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questionScores.map((question) => {
                  const closesAt = new Date(question.closesAt);
                  const closed = closesAt <= new Date();
                  return (
                    <TableRow key={question.id}>
                      <TableCell className="max-w-xl font-medium">{question.question}</TableCell>
                      <TableCell>{closesAt.toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" })}</TableCell>
                      <TableCell><Badge variant={closed ? "secondary" : "default"}>{closed ? "Fechada" : "Aberta"}</Badge></TableCell>
                      <TableCell><Input className="w-24" type="number" min={1} step={1} disabled={!isOwner} value={question.points} onChange={(event) => updateQuestionScore(question.id, Number(event.target.value))} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : <p className="text-sm text-muted-foreground">Nenhuma pergunta livre cadastrada para este bolão.</p>}

          {isOwner ? (
            <div className="flex flex-wrap justify-end gap-2">
              <Button className="gap-2" disabled={!questionScores.length || updateQuestionScoresMutation.isPending} onClick={() => void saveQuestionScores()}><Save className="size-4" />Salvar pontuação das perguntas</Button>
            </div>
          ) : <p className="text-sm text-muted-foreground">Somente o criador do bolão pode alterar a pontuação das perguntas.</p>}
        </CardContent>
      </Card>
    </PageShell>
  );
}
