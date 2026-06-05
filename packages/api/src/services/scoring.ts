export const DEFAULT_POOL_SCORING_RULES = [
  { stage: "group", label: "Fase de grupos", exactScorePoints: 10, outcomePoints: 5, brazilMultiplier: 2 },
  { stage: "round_of_32", label: "16 avos / mata-mata inicial", exactScorePoints: 12, outcomePoints: 6, brazilMultiplier: 2 },
  { stage: "round_of_16", label: "Oitavas", exactScorePoints: 15, outcomePoints: 8, brazilMultiplier: 2 },
  { stage: "quarter_final", label: "Quartas", exactScorePoints: 20, outcomePoints: 10, brazilMultiplier: 2 },
  { stage: "semi_final", label: "Semifinal", exactScorePoints: 30, outcomePoints: 15, brazilMultiplier: 2 },
  { stage: "third_place", label: "3º lugar", exactScorePoints: 20, outcomePoints: 10, brazilMultiplier: 2 },
  { stage: "final", label: "Final", exactScorePoints: 40, outcomePoints: 20, brazilMultiplier: 2 },
] as const;

export type PoolScoringStage = (typeof DEFAULT_POOL_SCORING_RULES)[number]["stage"];

export type PoolScoringRule = {
  stage: PoolScoringStage;
  label: string;
  exactScorePoints: number;
  outcomePoints: number;
  brazilMultiplier: number;
};

export type ScoreType = "exact" | "outcome" | "none";

const defaultRulesByStage = new Map<string, PoolScoringRule>(DEFAULT_POOL_SCORING_RULES.map((rule) => [rule.stage, rule]));

export function mergePoolScoringRules(customRules: Array<Omit<PoolScoringRule, "label">>): PoolScoringRule[] {
  const customRulesByStage = new Map(customRules.map((rule) => [rule.stage, rule]));

  return DEFAULT_POOL_SCORING_RULES.map((defaultRule) => ({
    ...defaultRule,
    ...customRulesByStage.get(defaultRule.stage),
  }));
}

export function normalizeScoringStage(stage: string | null): PoolScoringStage {
  const normalized = (stage ?? "").toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");

  if (["group", "groups", "group_stage", "fase_de_grupos"].includes(normalized)) return "group";
  if (["round_of_32", "last_32", "32", "sixteenth", "sixteenths", "16_avos", "mata_mata_inicial"].includes(normalized)) return "round_of_32";
  if (["round_of_16", "last_16", "16", "oitavas"].includes(normalized)) return "round_of_16";
  if (["quarter_final", "quarterfinal", "quarter_finals", "quarterfinals", "quartas"].includes(normalized)) return "quarter_final";
  if (["semi_final", "semifinal", "semi_finals", "semifinals", "semifinal"].includes(normalized)) return "semi_final";
  if (["third_place", "third_place_playoff", "3rd_place", "3_lugar", "terceiro_lugar"].includes(normalized)) return "third_place";
  if (["final", "finals"].includes(normalized)) return "final";

  return "group";
}

export function isBrazilMatch(matchData: {
  homeTeam: string | null;
  awayTeam: string | null;
  homeTeamLabel: string | null;
  awayTeamLabel: string | null;
  homeTeamExternalId?: string | null;
  awayTeamExternalId?: string | null;
}) {
  const values = [
    matchData.homeTeam,
    matchData.awayTeam,
    matchData.homeTeamLabel,
    matchData.awayTeamLabel,
    matchData.homeTeamExternalId,
    matchData.awayTeamExternalId,
  ];

  return values.some((value) => {
    const normalized = (value ?? "").trim().toLowerCase();
    return ["brazil", "brasil", "bra"].includes(normalized) || normalized.includes("brasil") || normalized.includes("brazil");
  });
}

function outcome(homeGoals: number, awayGoals: number) {
  if (homeGoals > awayGoals) return "home";
  if (awayGoals > homeGoals) return "away";
  return "draw";
}

export function calculateMatchPredictionScore(input: {
  predictionHomeGoals: number | null;
  predictionAwayGoals: number | null;
  matchHomeScore: number | null;
  matchAwayScore: number | null;
  stage: string | null;
  isBrazilMatch: boolean;
  rules: readonly PoolScoringRule[];
}) {
  const rule = input.rules.find((item) => item.stage === normalizeScoringStage(input.stage)) ?? defaultRulesByStage.get("group")!;
  const hasPrediction = input.predictionHomeGoals !== null && input.predictionAwayGoals !== null;
  const hasResult = input.matchHomeScore !== null && input.matchAwayScore !== null;

  if (!hasPrediction || !hasResult) {
    return { points: 0, basePoints: 0, type: "none" as ScoreType, multiplied: false, rule };
  }

  const exact = input.predictionHomeGoals === input.matchHomeScore && input.predictionAwayGoals === input.matchAwayScore;
  const predictedOutcome = outcome(input.predictionHomeGoals!, input.predictionAwayGoals!);
  const realOutcome = outcome(input.matchHomeScore!, input.matchAwayScore!);
  const type: ScoreType = exact ? "exact" : predictedOutcome === realOutcome ? "outcome" : "none";
  const basePoints = type === "exact" ? rule.exactScorePoints : type === "outcome" ? rule.outcomePoints : 0;
  const multiplied = basePoints > 0 && input.isBrazilMatch;

  return {
    points: multiplied ? basePoints * rule.brazilMultiplier : basePoints,
    basePoints,
    type,
    multiplied,
    rule,
  };
}
