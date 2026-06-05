export type Jogo = {
  id: string;
  rodada: string;
  stage: string | null;
  stageLabel: string;
  groupName: string | null;
  matchday: number | null;
  horario: string;
  startsAt: Date;
  estadio: string | null;
  cidade: string | null;
  mandante: string;
  visitante: string;
  mandanteEmoji: string | null;
  visitanteEmoji: string | null;
  golsMandanteResultado: number | null;
  golsVisitanteResultado: number | null;
  oddsMandante: number | null;
  oddsEmpate: number | null;
  oddsVisitante: number | null;
  encerrado: boolean;
  bloqueado: boolean;
  status: "missing" | "open" | "saved" | "locked" | "finished";
  statusLabel: string;
  pontuacao: {
    placarExato: number;
    resultado: number;
    jogoBrasil: boolean;
    multiplicadorBrasil: number;
  } | null;
};

export type Palpite = {
  id?: string | null;
  golsMandante: number | null;
  golsVisitante: number | null;
};

export type PalpiteUpdate = {
  jogoId: string;
  lado: "mandante" | "visitante";
  gols: number | null;
};

export type PredictionSaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";
