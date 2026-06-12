import { useEffect, useRef, useState } from "react";
import { BarChart3 } from "lucide-react";

import { ComparisonModal, QuestionComparisonModal } from "@/components/participant-page";
import { usePoolQuestionComparisonQuery } from "@/hooks/use-pool-questions-api";
import { PageHeader, PageShell } from "@/components/page-shell";
import { MatchTime } from "@/components/match-time";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TeamFlag } from "@/components/team-flag";
import { usePredictionMatchComparisonQuery } from "@/hooks/use-predictions-api";
import { usePoolScoringParticipantPredictionsQuery, usePoolScoringRankingQuery } from "@/hooks/use-pool-scoring-api";
import { usePoolsListQuery } from "@/hooks/use-pools-api";
import { useSessionQuery } from "@/hooks/use-session-api";
import { formatTeamNamePtBr } from "@/lib/team-names";
import { cn } from "@/lib/utils";

const stageLabels: Record<string, string> = {
  group: "Fase de grupos",
  r32: "16 Avos",
  round_of_32: "16 Avos",
  r16: "Oitavas",
  round_of_16: "Oitavas",
  qf: "Quartas",
  quarter_final: "Quartas",
  sf: "Seminal",
  semi_final: "Seminal",
  third: "Terceiro Lugar",
  third_place: "Terceiro Lugar",
  final: "Final",
};
const allowedGroupFilters: string[] = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

function formatOdd(value: number | null | undefined) {
  return value === null || value === undefined ? "-" : value.toFixed(2);
}

function getStageLabel(stage: string | null) {
  if (!stage) return "Fase";
  return stageLabels[stage] ?? stage;
}

function TeamNameWithFlag({ emoji, name }: { emoji: string | null | undefined; name: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <TeamFlag emoji={emoji} name={name} />
      <span className="truncate">{formatTeamNamePtBr(name)}</span>
    </span>
  );
}

export function PoolResultsPage({ initialPoolId = null }: { initialPoolId?: string | null }) {
  const poolsQuery = usePoolsListQuery();
  const sessionQuery = useSessionQuery();
  const pools = poolsQuery.data ?? [];
  const playedLastPlaceAudioPoolsRef = useRef(new Set<string>());
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(initialPoolId);
  const [selectedParticipantUserId, setSelectedParticipantUserId] = useState<string | null>(null);
  const [selectedDetailView, setSelectedDetailView] = useState<"matches" | "questions">("matches");
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>("all");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>("all");
  const [selectedComparisonMatchId, setSelectedComparisonMatchId] = useState<string | null>(null);
  const [selectedComparisonQuestionId, setSelectedComparisonQuestionId] = useState<string | null>(null);
  const rankingQuery = usePoolScoringRankingQuery(selectedPoolId);
  const participantPredictionsQuery = usePoolScoringParticipantPredictionsQuery(selectedPoolId, selectedParticipantUserId);
  const comparisonQuery = usePredictionMatchComparisonQuery(selectedPoolId, selectedComparisonMatchId);
  const questionComparisonQuery = usePoolQuestionComparisonQuery(selectedPoolId, selectedComparisonQuestionId);
  const selectedPool = pools.find((pool) => pool.id === selectedPoolId);
  const ranking = rankingQuery.data ?? [];
  const participantPredictions = participantPredictionsQuery.data;
  const currentUserId = sessionQuery.data?.user?.id;
  const availableStages = Array.from(new Set((participantPredictions?.matches ?? []).map((item) => item.stage).filter((stage): stage is string => Boolean(stage))));
  const availableGroups = allowedGroupFilters.filter((groupName) =>
    (participantPredictions?.matches ?? []).some((item) => item.groupName === groupName),
  );
  const filteredMatches = (participantPredictions?.matches ?? []).filter((item) => {
    if (selectedStageFilter !== "all" && item.stage !== selectedStageFilter) return false;
    if (selectedGroupFilter !== "all" && item.groupName !== selectedGroupFilter) return false;
    return true;
  });

  useEffect(() => {
    if (initialPoolId && initialPoolId !== selectedPoolId) {
      setSelectedPoolId(initialPoolId);
      setSelectedParticipantUserId(null);
      setSelectedStageFilter("all");
      setSelectedGroupFilter("all");
      return;
    }

    if (!selectedPoolId && pools[0]) setSelectedPoolId(pools[0].id);
  }, [initialPoolId, selectedPoolId, pools]);

  useEffect(() => {
    if (!ranking.length || selectedParticipantUserId) return;

    const currentUserRanking = ranking.find((entry) => entry.userId === currentUserId);
    setSelectedParticipantUserId(currentUserRanking?.userId ?? ranking[0]?.userId ?? null);
  }, [currentUserId, ranking, selectedParticipantUserId]);

  useEffect(() => {
    if (!selectedParticipantUserId || ranking.some((entry) => entry.userId === selectedParticipantUserId)) return;

    const currentUserRanking = ranking.find((entry) => entry.userId === currentUserId);
    setSelectedParticipantUserId(currentUserRanking?.userId ?? ranking[0]?.userId ?? null);
  }, [currentUserId, ranking, selectedParticipantUserId]);

  useEffect(() => {
    if (selectedStageFilter !== "all" && !availableStages.includes(selectedStageFilter)) {
      setSelectedStageFilter("all");
    }
  }, [availableStages, selectedStageFilter]);

  useEffect(() => {
    if (selectedGroupFilter !== "all" && !availableGroups.includes(selectedGroupFilter)) {
      setSelectedGroupFilter("all");
    }
  }, [availableGroups, selectedGroupFilter]);

  useEffect(() => {
    if (!selectedPoolId || !currentUserId || !ranking.length) return;

    const lastEntry = ranking[ranking.length - 1];
    const isCurrentUserLast = lastEntry?.userId === currentUserId;
    if (!isCurrentUserLast || playedLastPlaceAudioPoolsRef.current.has(selectedPoolId)) return;

    const playAudio = () => {
      if (document.visibilityState !== "visible") return;
      if (playedLastPlaceAudioPoolsRef.current.has(selectedPoolId)) return;

      playedLastPlaceAudioPoolsRef.current.add(selectedPoolId);
      const audio = new Audio("/nao-sobrou-nada.mp3");
      audio.currentTime = 0;
      void audio.play().catch(() => {
        playedLastPlaceAudioPoolsRef.current.delete(selectedPoolId);
      });
    };

    playAudio();
    document.addEventListener("visibilitychange", playAudio);

    return () => {
      document.removeEventListener("visibilitychange", playAudio);
    };
  }, [currentUserId, ranking, selectedPoolId]);

  return (
    <PageShell className="space-y-6" wide>
      <PageHeader title="Ranking" description="Veja a classificação do bolão com pontuação calculada pelas regras configuradas." />

      <Card className="bg-card/80 backdrop-blur-sm">
        <CardHeader><CardTitle>Selecione o bolão</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {pools.map((pool) => (
            <Button
              key={pool.id}
              variant={pool.id === selectedPoolId ? "default" : "soft"}
              onClick={() => {
                setSelectedPoolId(pool.id);
                setSelectedParticipantUserId(null);
              }}
            >
              {pool.name}
            </Button>
          ))}
        </CardContent>
      </Card>

      {poolsQuery.status === "pending" || rankingQuery.status === "pending" ? <Alert variant="info"><AlertTitle>Carregando ranking</AlertTitle><AlertDescription>Buscando participantes, palpites, perguntas e resultados.</AlertDescription></Alert> : null}
      {rankingQuery.status === "error" ? <Alert variant="destructive"><AlertTitle>Erro ao carregar ranking</AlertTitle><AlertDescription>{rankingQuery.error?.message || "Não foi possível carregar o ranking."}</AlertDescription></Alert> : null}
      {participantPredictionsQuery.status === "error" ? <Alert variant="destructive"><AlertTitle>Erro ao carregar palpites</AlertTitle><AlertDescription>{participantPredictionsQuery.error?.message || "Não foi possível carregar os palpites do participante."}</AlertDescription></Alert> : null}
      {poolsQuery.status === "success" && !pools.length ? <Alert variant="warning"><AlertTitle>Nenhum bolão encontrado</AlertTitle><AlertDescription>Crie ou entre em um bolão para ver o ranking.</AlertDescription></Alert> : null}

      {selectedPool ? (
        <>
          <Card className="bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>{selectedPool.name}</CardTitle>
                <Badge>Líder: {ranking[0]?.name ?? "-"}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Posição</TableHead>
                    <TableHead>Participante</TableHead>
                    <TableHead>Pontos</TableHead>
                    <TableHead>Bônus odds</TableHead>
                    <TableHead>Bônus Brasil</TableHead>
                    <TableHead>Placares exatos</TableHead>
                    <TableHead>Resultados corretos</TableHead>
                    <TableHead>Perguntas corretas</TableHead>
                    <TableHead>Pontos perguntas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranking.map((entry, index) => {
                    const selected = entry.userId === selectedParticipantUserId;

                    return (
                      <TableRow
                        key={entry.userId}
                        aria-selected={selected}
                        className={cn("cursor-pointer", selected && "bg-primary/10 hover:bg-primary/15")}
                        tabIndex={0}
                        onClick={() => setSelectedParticipantUserId(entry.userId)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedParticipantUserId(entry.userId);
                          }
                        }}
                      >
                        <TableCell>{index + 1}º</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{entry.name}</p>
                            <p className="text-xs text-muted-foreground">{entry.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">{entry.points}</TableCell>
                        <TableCell>
                          {entry.oddBonuses > 0 ? (
                            <div>
                              <p className="font-medium">{entry.oddBonusPoints} pts</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {entry.brazilBonusPoints > 0 ? (
                            <div>
                              <p className="font-medium">{entry.brazilBonusPoints} pts</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell>{entry.exactScores}</TableCell>
                        <TableCell>{entry.correctOutcomes}</TableCell>
                        <TableCell>{entry.correctQuestions}</TableCell>
                        <TableCell>{entry.questionPoints}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {rankingQuery.status === "success" && !ranking.length ? <p className="py-6 text-sm text-muted-foreground">Nenhum participante encontrado neste bolão.</p> : null}
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm">
            <CardHeader><CardTitle>Selecione o participante</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {ranking.map((entry) => (
                <Button
                  key={entry.userId}
                  variant={entry.userId === selectedParticipantUserId ? "default" : "soft"}
                  onClick={() => setSelectedParticipantUserId(entry.userId)}
                >
                  {entry.name}
                </Button>
              ))}
              {rankingQuery.status === "success" && !ranking.length ? <p className="text-sm text-muted-foreground">Nenhum participante encontrado neste bolão.</p> : null}
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>Palpites de {participantPredictions?.participant.name ?? "participante"}</CardTitle>
                {participantPredictions?.participant.isCurrentUser ? <Badge variant="secondary">Você</Badge> : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {participantPredictionsQuery.status === "pending" ? <p className="py-6 text-sm text-muted-foreground">Carregando palpites do participante.</p> : null}
              {participantPredictions && (participantPredictions.matches.length || participantPredictions.questions.length) ? (
                <>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Ver tabela de</p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant={selectedDetailView === "matches" ? "default" : "soft"}
                          size="sm"
                          onClick={() => setSelectedDetailView("matches")}
                        >
                          Palpites
                        </Button>
                        <Button
                          variant={selectedDetailView === "questions" ? "default" : "soft"}
                          size="sm"
                          onClick={() => setSelectedDetailView("questions")}
                        >
                          Perguntas
                        </Button>
                      </div>
                    </div>

                    {selectedDetailView === "matches" ? (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Filtrar por fase</p>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant={selectedStageFilter === "all" ? "default" : "soft"}
                              size="sm"
                              onClick={() => {
                                setSelectedStageFilter("all");
                                setSelectedGroupFilter("all");
                              }}
                            >
                              Todas
                            </Button>
                            {availableStages.map((stage) => (
                              <Button
                                key={stage}
                                variant={selectedStageFilter === stage ? "default" : "soft"}
                                size="sm"
                                onClick={() => {
                                  setSelectedStageFilter(stage);
                                  if (stage !== "group") setSelectedGroupFilter("all");
                                }}
                              >
                                {getStageLabel(stage)}
                              </Button>
                            ))}
                          </div>
                        </div>

                        {availableGroups.length ? (
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Ou por grupo</p>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant={selectedGroupFilter === "all" ? "default" : "soft"}
                                size="sm"
                                onClick={() => setSelectedGroupFilter("all")}
                              >
                                Todos
                              </Button>
                              {availableGroups.map((groupName) => (
                                <Button
                                  key={groupName}
                                  variant={selectedGroupFilter === groupName ? "default" : "soft"}
                                  size="sm"
                                  onClick={() => {
                                    setSelectedGroupFilter(groupName);
                                    setSelectedStageFilter("group");
                                  }}
                                >
                                  Grupo {groupName}
                                </Button>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  {selectedDetailView === "matches" ? (
                    participantPredictions.matches.length ? (
                      <>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Partida</TableHead>
                              <TableHead>Data</TableHead>
                              <TableHead>Palpite</TableHead>
                              <TableHead>Placar oficial</TableHead>
                              <TableHead>Pontos</TableHead>
                              <TableHead>Acerto</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredMatches.map((item) => {
                              const homeTeam = item.homeTeamLabel ?? item.homeTeam;
                              const awayTeam = item.awayTeamLabel ?? item.awayTeam;
                              const resultLabel = item.resultType === "exact" ? "placar exato" : item.resultType === "outcome" ? "resultado" : "sem pontos";
                              const resultVariant = item.resultType === "exact" ? "success" : item.resultType === "outcome" ? "warning" : "outline";
                              const detailLabel = item.groupName ? `Grupo ${item.groupName}` : getStageLabel(item.stage);

                              return (
                                <TableRow key={item.matchId}>
                                  <TableCell>
                                    <div>
                                      <p className="flex flex-wrap items-center gap-1.5 font-medium">
                                        <TeamNameWithFlag emoji={item.homeTeamEmoji} name={homeTeam} />
                                        <span className="text-muted-foreground">x</span>
                                        <TeamNameWithFlag emoji={item.awayTeamEmoji} name={awayTeam} />
                                        <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => setSelectedComparisonMatchId(item.matchId)}>
                                          <BarChart3 className="size-3" /> Comparar
                                        </Button>
                                      </p>
                                      <p className="text-xs text-muted-foreground">{detailLabel} · {item.finished ? "Encerrada" : "Pendente"}</p>
                                    </div>
                                  </TableCell>
                                  <TableCell><MatchTime startsAt={item.startsAt} startsAtTimeZone={item.startsAtTimeZone} /></TableCell>
                                  <TableCell>
                                    {item.showPrediction ? (
                                      item.hasPrediction ? <span className="font-semibold">{item.homeGoals} x {item.awayGoals}</span> : <span className="text-muted-foreground">Sem palpite</span>
                                    ) : (
                                      <span className="text-muted-foreground">Palpite oculto até a partida encerrar</span>
                                    )}
                                  </TableCell>
                                  <TableCell>{item.homeScore !== null && item.awayScore !== null ? <span className="font-semibold">{item.homeScore} x {item.awayScore}</span> : <span className="text-muted-foreground">-</span>}</TableCell>
                                  <TableCell className="font-semibold">
                                    <div>
                                      <p>{item.points}</p>
                                      {item.brazilBonusApplied ? (
                                        <p className="text-xs font-medium text-sky-700">
                                          Bônus Brasil: {item.brazilBonusMultiplier}x
                                        </p>
                                      ) : null}
                                      {item.oddBonusApplied ? (
                                        <p className="text-xs font-medium text-emerald-700">
                                          Bônus odd: +{item.oddBonusPoints} pts ({item.oddBonusPercent}% sobre odd {formatOdd(item.oddUsed)})
                                        </p>
                                      ) : null}
                                    </div>
                                  </TableCell>
                                  <TableCell><Badge variant={resultVariant}>{resultLabel}</Badge></TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>

                        {!filteredMatches.length ? <p className="py-2 text-sm text-muted-foreground">Nenhuma partida encontrada com esse filtro.</p> : null}
                      </>
                    ) : (
                      <p className="py-2 text-sm text-muted-foreground">Nenhuma partida encontrada neste bolão.</p>
                    )
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium">Perguntas respondidas</p>
                        <p className="text-sm text-muted-foreground">Resumo simples das respostas e da pontuação de cada pergunta.</p>
                      </div>

                      {participantPredictions?.questions.length ? (
                        <div className="flex flex-wrap gap-2">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Pergunta</TableHead>
                                <TableHead>Resposta</TableHead>
                                <TableHead>Pontuação</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {participantPredictions.questions.map((item) => (
                                <TableRow key={item.questionId}>
                                  <TableCell>
                                    <p className="flex flex-wrap items-center gap-2 font-medium">
                                      <span>{item.question}</span>
                                      <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => setSelectedComparisonQuestionId(item.questionId)}>
                                        <BarChart3 className="size-3" /> Comparar
                                      </Button>
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {item.isCorrect === null ? "Pendente" : "Finalizada"}
                                    </p>
                                  </TableCell>
                                  <TableCell>
                                    {item.showAnswer ? item.answer?.trim() ? item.answer : <span className="text-muted-foreground">Sem resposta</span> : <span className="text-muted-foreground">Resposta oculta até o prazo encerrar</span>}
                                  </TableCell>
                                  <TableCell className="font-semibold">
                                    {item.isCorrect === null ? <span className="text-muted-foreground">Aguardando correção</span> : item.points}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Nenhuma pergunta cadastrada neste bolão.</p>
                      )}
                    </div>
                  )}
                </>
              ) : null}
              {participantPredictionsQuery.status === "success" && !participantPredictions?.matches.length && !participantPredictions?.questions.length ? <p className="py-6 text-sm text-muted-foreground">Nenhuma partida ou pergunta encontrada neste bolão.</p> : null}
            </CardContent>
          </Card>
        </>
      ) : null}
      {selectedComparisonMatchId ? <ComparisonModal data={comparisonQuery.data} status={comparisonQuery.status} error={comparisonQuery.error} onClose={() => setSelectedComparisonMatchId(null)} /> : null}
      {selectedComparisonQuestionId ? <QuestionComparisonModal data={questionComparisonQuery.data} status={questionComparisonQuery.status} error={questionComparisonQuery.error} onClose={() => setSelectedComparisonQuestionId(null)} /> : null}
    </PageShell>
  );
}
