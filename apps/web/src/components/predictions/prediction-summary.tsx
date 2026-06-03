import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export function PredictionSummary({ totalJogos, palpitesPreenchidos }: { totalJogos: number; palpitesPreenchidos: number }) {
  const percentage = Math.round((palpitesPreenchidos / totalJogos) * 100) || 0;

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
        <div>
          <p className="text-sm text-muted-foreground">Progresso dos palpites</p>
          <p className="text-xl font-semibold">
            {palpitesPreenchidos} / {totalJogos}
          </p>
        </div>
        <Badge>{percentage}%</Badge>
      </CardContent>
    </Card>
  );
}
