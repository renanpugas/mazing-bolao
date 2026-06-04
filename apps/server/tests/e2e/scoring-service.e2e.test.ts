import { describe, expect, it } from "vitest";

import { calculateMatchPredictionScore, DEFAULT_POOL_SCORING_RULES, isBrazilMatch } from "@mazing-bolao/api/services/scoring";

describe("Scoring service", () => {
  it("should calculate exact score points with Brazil multiplier", () => {
    const score = calculateMatchPredictionScore({
      predictionHomeGoals: 2,
      predictionAwayGoals: 1,
      matchHomeScore: 2,
      matchAwayScore: 1,
      stage: "final",
      isBrazilMatch: true,
      rules: DEFAULT_POOL_SCORING_RULES,
    });

    expect(score).toMatchObject({ points: 80, basePoints: 40, type: "exact", multiplied: true });
  });

  it("should calculate winner or draw partial points", () => {
    const winnerScore = calculateMatchPredictionScore({
      predictionHomeGoals: 3,
      predictionAwayGoals: 1,
      matchHomeScore: 2,
      matchAwayScore: 1,
      stage: "group",
      isBrazilMatch: false,
      rules: DEFAULT_POOL_SCORING_RULES,
    });
    const drawScore = calculateMatchPredictionScore({
      predictionHomeGoals: 0,
      predictionAwayGoals: 0,
      matchHomeScore: 1,
      matchAwayScore: 1,
      stage: "round_of_16",
      isBrazilMatch: false,
      rules: DEFAULT_POOL_SCORING_RULES,
    });

    expect(winnerScore).toMatchObject({ points: 5, type: "outcome" });
    expect(drawScore).toMatchObject({ points: 8, type: "outcome" });
  });

  it("should return zero for wrong outcome or incomplete data", () => {
    const wrongScore = calculateMatchPredictionScore({
      predictionHomeGoals: 1,
      predictionAwayGoals: 0,
      matchHomeScore: 0,
      matchAwayScore: 1,
      stage: "semi_final",
      isBrazilMatch: true,
      rules: DEFAULT_POOL_SCORING_RULES,
    });
    const incompleteScore = calculateMatchPredictionScore({
      predictionHomeGoals: null,
      predictionAwayGoals: 0,
      matchHomeScore: 0,
      matchAwayScore: 0,
      stage: "group",
      isBrazilMatch: true,
      rules: DEFAULT_POOL_SCORING_RULES,
    });

    expect(wrongScore).toMatchObject({ points: 0, type: "none", multiplied: false });
    expect(incompleteScore).toMatchObject({ points: 0, type: "none", multiplied: false });
  });

  it("should detect Brazil matches by team names and labels", () => {
    expect(isBrazilMatch({ homeTeam: "Brasil", awayTeam: "Argentina", homeTeamLabel: null, awayTeamLabel: null })).toBe(true);
    expect(isBrazilMatch({ homeTeam: "France", awayTeam: "Germany", homeTeamLabel: null, awayTeamLabel: null })).toBe(false);
  });
});
