import { useEffect, useState } from "react";

import { PageHeader, PageShell } from "@/components/page-shell";
import { MatchTime } from "@/components/match-time";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePoolScoringParticipantPredictionsQuery, usePoolScoringRankingQuery } from "@/hooks/use-pool-scoring-api";
import { usePoolsListQuery } from "@/hooks/use-pools-api";
import { useSessionQuery } from "@/hooks/use-session-api";
import { cn } from "@/lib/utils";

export function PoolResultsPage({ initialPoolId = null }: { initialPoolId?: string | null }) {
  const poolsQuery = usePoolsListQuery();
  const sessionQuery = useSessionQuery();
  const pools = poolsQuery.data ?? [];
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(initialPoolId);
  const [selectedParticipantUserId, setSelectedParticipantUserId] = useState<string | null>(null);
  const rankingQuery = usePoolScoringRankingQuery(selectedPoolId);
  const participantPredictionsQuery = usePoolScoringParticipantPredictionsQuery(selectedPoolId, selectedParticipantUserId);
  const selectedPool = pools.find((pool) => pool.id === selectedPoolId);
  const ranking = rankingQuery.data ?? [];
  const participantPredictions = participantPredictionsQuery.data;
  const currentUserId = sessionQuery.data?.user?.id;

  useEffect(() => {
    if (initialPoolId && initialPoolId !== selectedPoolId) {
      setSelectedPoolId(initialPoolId);
      setSelectedParticipantUserId(null);
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

  return (
    <PageShell className="space-y-6">
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
                    <TableHead>Placares exatos</TableHead>
                    <TableHead>Resultados corretos</TableHead>
                    <TableHead>Perguntas corretas</TableHead>
                    <TableHead>Pontos perguntas</TableHead>
                    <TableHead>Bônus Brasil</TableHead>
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
                        <TableCell>{entry.exactScores}</TableCell>
                        <TableCell>{entry.correctOutcomes}</TableCell>
                        <TableCell>{entry.correctQuestions}</TableCell>
                        <TableCell>{entry.questionPoints}</TableCell>
                        <TableCell>{entry.brazilBonuses}</TableCell>
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
            <CardContent>
              {participantPredictionsQuery.status === "pending" ? <p className="py-6 text-sm text-muted-foreground">Carregando palpites do participante.</p> : null}
              {participantPredictionsQuery.status === "success" && !participantPredictions?.matches.length ? <p className="py-6 text-sm text-muted-foreground">Nenhuma partida encontrada neste bolão.</p> : null}
              {participantPredictions?.matches.length ? (
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
                    {participantPredictions.matches.map((item) => {
                      const homeTeam = item.homeTeamLabel ?? item.homeTeam;
                      const awayTeam = item.awayTeamLabel ?? item.awayTeam;
                      const resultLabel = item.resultType === "exact" ? "placar exato" : item.resultType === "outcome" ? "resultado" : "sem pontos";
                      const resultVariant = item.resultType === "exact" ? "success" : item.resultType === "outcome" ? "warning" : "outline";

                      return (
                        <TableRow key={item.matchId}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{homeTeam} x {awayTeam}</p>
                              <p className="text-xs text-muted-foreground">{item.finished ? "Encerrada" : "Pendente"}</p>
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
                            {item.points}
                            {item.oddBonusApplied ? <span className="ml-1 text-xs text-emerald-700">(+{item.oddBonusPoints})</span> : null}
                          </TableCell>
                          <TableCell><Badge variant={resultVariant}>{resultLabel}</Badge></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : null}
            </CardContent>
          </Card>
        </>
      ) : null}
    </PageShell>
  );
}
