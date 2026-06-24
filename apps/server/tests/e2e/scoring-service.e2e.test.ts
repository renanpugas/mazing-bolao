import { describe, expect, it } from "vitest";

import { calculateMatchPredictionScore, DEFAULT_POOL_SCORING_RULES, isBrazilMatch, normalizeScoringStage } from "@mazing-bolao/api/services/scoring";

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

  it("should keep current score without odd bonus rules", () => {
    const score = calculateMatchPredictionScore({
      predictionHomeGoals: 2,
      predictionAwayGoals: 1,
      matchHomeScore: 2,
      matchAwayScore: 1,
      stage: "group",
      isBrazilMatch: false,
      rules: DEFAULT_POOL_SCORING_RULES,
      oddsHomeTeam: 2.5,
    });

    expect(score).toMatchObject({ points: 10, oddBonusPoints: 0, oddBonusApplied: false, oddBonusPercent: 0, oddUsed: 2.5 });
  });

  it("should add odd bonus when the winning odd passes a threshold", () => {
    const score = calculateMatchPredictionScore({
      predictionHomeGoals: 2,
      predictionAwayGoals: 0,
      matchHomeScore: 3,
      matchAwayScore: 1,
      stage: "group",
      isBrazilMatch: false,
      rules: DEFAULT_POOL_SCORING_RULES,
      oddBonusRules: [{ oddThreshold: 2, bonusPercent: 50 }],
      oddsHomeTeam: 2.5,
    });

    expect(score).toMatchObject({ points: 8, basePoints: 5, type: "outcome", oddBonusPoints: 3, oddBonusPercent: 50, oddUsed: 2.5, oddBonusApplied: true });
  });

  it("should use only the highest compatible odd bonus threshold", () => {
    const score = calculateMatchPredictionScore({
      predictionHomeGoals: 0,
      predictionAwayGoals: 1,
      matchHomeScore: 1,
      matchAwayScore: 2,
      stage: "group",
      isBrazilMatch: false,
      rules: DEFAULT_POOL_SCORING_RULES,
      oddBonusRules: [
        { oddThreshold: 2, bonusPercent: 50 },
        { oddThreshold: 4, bonusPercent: 80 },
        { oddThreshold: 10, bonusPercent: 120 },
      ],
      oddsAwayTeam: 11,
    });

    expect(score).toMatchObject({ points: 11, oddBonusPoints: 6, oddBonusPercent: 120, oddUsed: 11, oddBonusApplied: true });
  });

  it("should round odd bonus points to the nearest integer", () => {
    const score = calculateMatchPredictionScore({
      predictionHomeGoals: 1,
      predictionAwayGoals: 1,
      matchHomeScore: 1,
      matchAwayScore: 1,
      stage: "group",
      isBrazilMatch: false,
      rules: DEFAULT_POOL_SCORING_RULES,
      oddBonusRules: [{ oddThreshold: 2, bonusPercent: 25 }],
      oddsDraw: 3.1,
    });

    expect(score).toMatchObject({ points: 13, oddBonusPoints: 3, oddBonusPercent: 25 });
  });

  it("should apply odd bonus after Brazil multiplier", () => {
    const score = calculateMatchPredictionScore({
      predictionHomeGoals: 2,
      predictionAwayGoals: 0,
      matchHomeScore: 2,
      matchAwayScore: 0,
      stage: "group",
      isBrazilMatch: true,
      rules: DEFAULT_POOL_SCORING_RULES,
      oddBonusRules: [{ oddThreshold: 2, bonusPercent: 50 }],
      oddsHomeTeam: 2.5,
    });

    expect(score).toMatchObject({ points: 30, basePoints: 10, multiplied: true, oddBonusPoints: 10, oddBonusPercent: 50 });
  });

  it("should not add odd bonus for wrong predictions or incomplete odds", () => {
    const wrongScore = calculateMatchPredictionScore({
      predictionHomeGoals: 1,
      predictionAwayGoals: 0,
      matchHomeScore: 0,
      matchAwayScore: 1,
      stage: "group",
      isBrazilMatch: false,
      rules: DEFAULT_POOL_SCORING_RULES,
      oddBonusRules: [{ oddThreshold: 2, bonusPercent: 50 }],
      oddsAwayTeam: 4,
    });
    const missingOddScore = calculateMatchPredictionScore({
      predictionHomeGoals: 1,
      predictionAwayGoals: 0,
      matchHomeScore: 2,
      matchAwayScore: 0,
      stage: "group",
      isBrazilMatch: false,
      rules: DEFAULT_POOL_SCORING_RULES,
      oddBonusRules: [{ oddThreshold: 2, bonusPercent: 50 }],
    });

    expect(wrongScore).toMatchObject({ points: 0, oddBonusPoints: 0, oddBonusApplied: false });
    expect(missingOddScore).toMatchObject({ points: 5, oddBonusPoints: 0, oddBonusApplied: false, oddUsed: null });
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

  it("should normalize short knockout stage aliases from synced matches", () => {
    expect(normalizeScoringStage("r32")).toBe("round_of_32");
    expect(normalizeScoringStage("r16")).toBe("round_of_16");
    expect(normalizeScoringStage("qf")).toBe("quarter_final");
    expect(normalizeScoringStage("sf")).toBe("semi_final");
    expect(normalizeScoringStage("third")).toBe("third_place");
  });

  it("should detect Brazil matches by team names and labels", () => {
    expect(isBrazilMatch({ homeTeam: "Brasil", awayTeam: "Argentina", homeTeamLabel: null, awayTeamLabel: null })).toBe(true);
    expect(isBrazilMatch({ homeTeam: "France", awayTeam: "Germany", homeTeamLabel: null, awayTeamLabel: null })).toBe(false);
  });

  it("should ignore stale labels when the actual team has already been resolved", () => {
    expect(
      isBrazilMatch({
        homeTeam: "Germany",
        awayTeam: "Argentina",
        homeTeamLabel: "Brasil",
        awayTeamLabel: null,
        homeTeamExternalId: "17",
        awayTeamExternalId: "37",
      }),
    ).toBe(false);

    expect(
      isBrazilMatch({
        homeTeam: "Winner Group C",
        awayTeam: "Argentina",
        homeTeamLabel: "Brasil",
        awayTeamLabel: null,
        homeTeamExternalId: null,
        awayTeamExternalId: "37",
      }),
    ).toBe(true);
  });
});
