import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { PageHeader, PageShell } from "@/components/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePoolScoringRankingQuery } from "@/hooks/use-pool-scoring-api";
import { usePoolsListQuery } from "@/hooks/use-pools-api";

export const Route = createFileRoute("/pool-results")({ component: PoolResultsPage });

function PoolResultsPage() {
  const poolsQuery = usePoolsListQuery();
  const pools = poolsQuery.data ?? [];
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const rankingQuery = usePoolScoringRankingQuery(selectedPoolId);
  const selectedPool = pools.find((pool) => pool.id === selectedPoolId);
  const ranking = rankingQuery.data ?? [];

  useEffect(() => {
    if (!selectedPoolId && pools[0]) setSelectedPoolId(pools[0].id);
  }, [selectedPoolId, pools]);

  return (
    <PageShell className="space-y-6">
      <PageHeader title="Ranking" description="Veja a classificação do bolão com pontuação calculada pelas regras configuradas." />

      <Card className="bg-card/80 backdrop-blur-sm">
        <CardHeader><CardTitle>Selecione o bolão</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {pools.map((pool) => <Button key={pool.id} variant={pool.id === selectedPoolId ? "default" : "soft"} onClick={() => setSelectedPoolId(pool.id)}>{pool.name}</Button>)}
        </CardContent>
      </Card>

      {poolsQuery.status === "pending" || rankingQuery.status === "pending" ? <Alert variant="info"><AlertTitle>Carregando ranking</AlertTitle><AlertDescription>Buscando participantes, palpites, perguntas e resultados.</AlertDescription></Alert> : null}
      {rankingQuery.status === "error" ? <Alert variant="destructive"><AlertTitle>Erro ao carregar ranking</AlertTitle><AlertDescription>{rankingQuery.error?.message || "Não foi possível carregar o ranking."}</AlertDescription></Alert> : null}
      {poolsQuery.status === "success" && !pools.length ? <Alert variant="warning"><AlertTitle>Nenhum bolão encontrado</AlertTitle><AlertDescription>Crie ou entre em um bolão para ver o ranking.</AlertDescription></Alert> : null}

      {selectedPool ? (
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
                {ranking.map((entry, index) => (
                  <TableRow key={entry.userId}>
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
                ))}
              </TableBody>
            </Table>
            {rankingQuery.status === "success" && !ranking.length ? <p className="py-6 text-sm text-muted-foreground">Nenhum participante encontrado neste bolão.</p> : null}
          </CardContent>
        </Card>
      ) : null}
    </PageShell>
  );
}
