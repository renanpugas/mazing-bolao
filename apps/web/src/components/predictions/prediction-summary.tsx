import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export function PredictionSummary({
  totalJogos,
  palpitesPreenchidos,
  pendentes = 0,
  encerrados = 0,
  bloqueados = 0,
}: {
  totalJogos: number;
  palpitesPreenchidos: number;
  pendentes?: number;
  encerrados?: number;
  bloqueados?: number;
}) {
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
        <div className="flex flex-wrap gap-2">
          <Badge>{percentage}%</Badge>
          <Badge variant="warning">{pendentes} pendente(s)</Badge>
          <Badge variant="secondary">{bloqueados} bloqueado(s)</Badge>
          <Badge variant="outline">{encerrados} encerrado(s)</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
