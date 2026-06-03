import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { PageHeader, PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type RankingEntry = { id: number; name: string; points: number; exactScores: number; correctOutcomes: number };
type Pool = { id: number; name: string; ranking: RankingEntry[] };

const pools: Pool[] = [
  { id: 1, name: "Office League", ranking: [{ id: 1, name: "Ana", points: 24, exactScores: 6, correctOutcomes: 9 }, { id: 2, name: "Renan", points: 21, exactScores: 5, correctOutcomes: 8 }, { id: 3, name: "Carlos", points: 19, exactScores: 4, correctOutcomes: 7 }] },
  { id: 2, name: "Family Cup", ranking: [{ id: 1, name: "Marcos", points: 17, exactScores: 3, correctOutcomes: 8 }, { id: 2, name: "Julia", points: 16, exactScores: 3, correctOutcomes: 7 }, { id: 3, name: "Paula", points: 13, exactScores: 2, correctOutcomes: 6 }] },
  { id: 3, name: "Friends Pool", ranking: [{ id: 1, name: "Leo", points: 28, exactScores: 7, correctOutcomes: 10 }, { id: 2, name: "Bianca", points: 25, exactScores: 6, correctOutcomes: 9 }, { id: 3, name: "Davi", points: 20, exactScores: 4, correctOutcomes: 8 }] },
];

export const Route = createFileRoute("/pool-results")({ component: PoolResultsPage });

function PoolResultsPage() {
  const [selectedPoolId, setSelectedPoolId] = useState(pools[0]?.id ?? 1);
  const selectedPool = pools.find((pool) => pool.id === selectedPoolId);
  const sortedRanking = selectedPool ? [...selectedPool.ranking].sort((a, b) => b.points - a.points || b.exactScores - a.exactScores || b.correctOutcomes - a.correctOutcomes) : [];

  return (
    <PageShell className="space-y-6">
      <PageHeader title="Pool Ranking" description="Select a pool to view the live leaderboard and who has the highest score." />
      <Card><CardHeader><CardTitle>Select Pool</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">{pools.map((pool) => <Button key={pool.id} variant={pool.id === selectedPoolId ? "default" : "soft"} onClick={() => setSelectedPoolId(pool.id)}>{pool.name}</Button>)}</CardContent></Card>
      {selectedPool ? <Card><CardHeader><div className="flex items-center justify-between gap-3"><CardTitle>{selectedPool.name} Ranking</CardTitle><Badge>Leader: {sortedRanking[0]?.name ?? "-"}</Badge></div></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Participant</TableHead><TableHead>Points</TableHead><TableHead>Exact Scores</TableHead><TableHead>Correct Outcomes</TableHead></TableRow></TableHeader><TableBody>{sortedRanking.map((entry) => <TableRow key={entry.id}><TableCell>{entry.name}</TableCell><TableCell>{entry.points}</TableCell><TableCell>{entry.exactScores}</TableCell><TableCell>{entry.correctOutcomes}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card> : null}
    </PageShell>
  );
}
