import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Jogo, Palpite, PalpiteUpdate } from "@/components/predictions/types";

const parseGols = (value: string) => {
  if (value === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : Math.max(0, parsed);
};

export function PredictionMatchCard({ jogo, palpite, onUpdate }: { jogo: Jogo; palpite: Palpite; onUpdate: (payload: PalpiteUpdate) => void }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-medium">{jogo.rodada}</div>
          <div className="text-xs text-muted-foreground">{jogo.horario}</div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1 truncate text-right font-medium">
            {jogo.mandanteEmoji ? <span className="mr-1">{jogo.mandanteEmoji}</span> : null}
            {jogo.mandante}
          </div>
          <Input
            value={palpite.golsMandante ?? ""}
            type="number"
            min="0"
            inputMode="numeric"
            className="w-16"
            disabled={jogo.bloqueado}
            onChange={(event) => onUpdate({ jogoId: jogo.id, lado: "mandante", gols: parseGols(event.target.value) })}
          />
          <span className="text-sm text-muted-foreground">x</span>
          <Input
            value={palpite.golsVisitante ?? ""}
            type="number"
            min="0"
            inputMode="numeric"
            className="w-16"
            disabled={jogo.bloqueado}
            onChange={(event) => onUpdate({ jogoId: jogo.id, lado: "visitante", gols: parseGols(event.target.value) })}
          />
          <div className="min-w-0 flex-1 truncate font-medium">
            {jogo.visitante}
            {jogo.visitanteEmoji ? <span className="ml-1">{jogo.visitanteEmoji}</span> : null}
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-between gap-2 text-xs text-muted-foreground">
        <span>{[jogo.estadio, jogo.cidade].filter(Boolean).join(" · ") || "Local a definir"}</span>
        {jogo.encerrado ? <Badge variant="secondary">Encerrado</Badge> : jogo.bloqueado ? <Badge variant="warning">Bloqueado</Badge> : <Badge variant="success">Aberto</Badge>}
      </CardFooter>
    </Card>
  );
}
