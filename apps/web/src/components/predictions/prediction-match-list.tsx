import { PredictionMatchCard } from "@/components/predictions/prediction-match-card";
import type { Jogo, Palpite, PalpiteUpdate, PredictionSaveStatus } from "@/components/predictions/types";

export function PredictionMatchList({
  jogos,
  palpites,
  onUpdate,
  onCompare,
  saveStatuses = {},
  compact,
}: {
  jogos: Jogo[];
  palpites: Record<string, Palpite>;
  onUpdate: (payload: PalpiteUpdate) => void;
  onCompare?: (jogoId: string) => void;
  saveStatuses?: Record<string, PredictionSaveStatus>;
  compact?: boolean;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {jogos.map((jogo) => (
        <PredictionMatchCard key={jogo.id} jogo={jogo} palpite={palpites[jogo.id] ?? { golsMandante: null, golsVisitante: null }} onUpdate={onUpdate} onCompare={onCompare} saveStatus={saveStatuses[jogo.id] ?? "idle"} compact={compact} />
      ))}
    </div>
  );
}
