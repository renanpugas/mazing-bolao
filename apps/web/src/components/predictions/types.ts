export type Jogo = {
  id: string;
  rodada: string;
  horario: string;
  estadio: string | null;
  cidade: string | null;
  mandante: string;
  visitante: string;
  mandanteEmoji: string | null;
  visitanteEmoji: string | null;
  encerrado: boolean;
  bloqueado: boolean;
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
