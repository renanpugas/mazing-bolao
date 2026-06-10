import { BarChart3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MatchTime } from "@/components/match-time";
import type { Jogo, Palpite, PalpiteUpdate, PredictionSaveStatus } from "@/components/predictions/types";

const parseGols = (value: string) => {
  if (value === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : Math.max(0, parsed);
};

const statusVariant = {
  missing: "warning",
  open: "success",
  saved: "default",
  locked: "secondary",
  finished: "secondary",
} as const;

const formatOdd = (odd: number | null) => odd?.toFixed(2) ?? "-";

export function PredictionMatchCard({
  jogo,
  palpite,
  onUpdate,
  onCompare,
  saveStatus = "idle",
  compact = false,
  timeline = false,
}: {
  jogo: Jogo;
  palpite: Palpite;
  onUpdate: (payload: PalpiteUpdate) => void;
  onCompare?: (jogoId: string) => void;
  saveStatus?: PredictionSaveStatus;
  compact?: boolean;
  timeline?: boolean;
}) {
  const applicableOddBonusRules = Array.from(
    new Map(
      [jogo.oddsMandante, jogo.oddsEmpate, jogo.oddsVisitante]
        .filter((odd): odd is number => odd !== null)
        .map((odd) =>
          jogo.oddBonusRules
            .filter((rule) => odd > rule.oddThreshold)
            .sort((left, right) => right.oddThreshold - left.oddThreshold)[0],
        )
        .filter((rule): rule is (typeof jogo.oddBonusRules)[number] => !!rule)
        .map((rule) => [`${rule.oddThreshold}-${rule.bonusPercent}`, rule]),
    ).values(),
  );

  return (
    <Card className={timeline ? "w-full" : undefined}>
      <CardHeader className={compact ? "p-4" : undefined}>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-medium">{jogo.rodada}</div>
            <div className="text-xs text-muted-foreground"><MatchTime startsAt={jogo.startsAt} startsAtTimeZone={jogo.startsAtTimeZone} /></div>
          </div>
          {jogo.pontuacao ? (
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Placar exato: {jogo.pontuacao.placarExato} pts</Badge>
              <Badge variant="outline">Resultado: {jogo.pontuacao.resultado} pts</Badge>
              {jogo.pontuacao.jogoBrasil ? <Badge>Jogo do Brasil {jogo.pontuacao.multiplicadorBrasil}x</Badge> : null}
              {applicableOddBonusRules.map((rule) => (
                <Badge key={`${rule.oddThreshold}-${rule.bonusPercent}`} variant="secondary">
                  Odd &gt; {formatOdd(rule.oddThreshold)}: +{rule.bonusPercent}%
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className={compact ? "px-4 pb-4" : undefined}>
        <div className={`grid grid-cols-[minmax(0,1fr)_4rem_auto_4rem_minmax(0,1fr)] items-end gap-3 ${timeline ? "w-full" : ""}`}>
          <div className="min-w-0 self-end pb-2 text-right">
            <div className="truncate font-medium">
            {jogo.mandante}
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="flex h-10 items-center justify-center gap-2">
              {jogo.oddsMandante !== null ? <span className="text-xs font-semibold text-muted-foreground">Odd {formatOdd(jogo.oddsMandante)}</span> : null}
              <span className="text-4xl leading-none">{jogo.mandanteEmoji}</span>
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
          </div>
          <div className="flex flex-col items-center gap-2 self-end pb-2">
            <div className="flex h-10 items-center justify-center">
              {jogo.oddsEmpate !== null ? <span className="text-xs font-semibold text-muted-foreground">{formatOdd(jogo.oddsEmpate)}</span> : null}
            </div>
            <span className="text-sm text-muted-foreground">x</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="flex h-10 items-center justify-center gap-2">
              <span className="text-4xl leading-none">{jogo.visitanteEmoji}</span>
              {jogo.oddsVisitante !== null ? <span className="text-xs font-semibold text-muted-foreground">Odd {formatOdd(jogo.oddsVisitante)}</span> : null}
            </div>
            <Input
              value={palpite.golsVisitante ?? ""}
              type="number"
              min="0"
              inputMode="numeric"
              className="w-16"
              disabled={jogo.bloqueado}
              onChange={(event) => onUpdate({ jogoId: jogo.id, lado: "visitante", gols: parseGols(event.target.value) })}
            />
          </div>
          <div className="min-w-0 self-end pb-2">
            <div className="truncate font-medium">
            {jogo.visitante}
            </div>
          </div>
        </div>
        {jogo.encerrado ? (
          <div className="mt-3 rounded-lg bg-muted px-3 py-2 text-center text-sm">
            Resultado final: <span className="font-semibold">{jogo.golsMandanteResultado ?? "-"} x {jogo.golsVisitanteResultado ?? "-"}</span>
          </div>
        ) : null}
      </CardContent>
      <CardFooter className={`justify-between gap-2 text-xs text-muted-foreground ${compact ? "px-4 pb-4" : ""}`}>
        <span>{[jogo.estadio, jogo.cidade].filter(Boolean).join(" · ") || "Local a definir"}</span>
        <div className="flex items-center gap-2">
          {onCompare ? (
            <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => onCompare(jogo.id)}>
              <BarChart3 className="size-3" /> Comparar
            </Button>
          ) : null}
          <Badge variant={saveStatus === "saving" ? "secondary" : saveStatus === "error" ? "destructive" : statusVariant[jogo.status]}>{saveStatus === "saving" ? "Salvando..." : saveStatus === "error" ? "Erro ao salvar" : jogo.statusLabel}</Badge>
        </div>
      </CardFooter>
    </Card>
  );
}
