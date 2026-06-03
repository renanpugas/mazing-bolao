import { describe, expect, it } from "vitest";

import { getFlagEmoji, getWorldCup2026Tournament, normalizeGame, normalizeGroup, normalizeStadium, normalizeTeam } from "@mazing-bolao/api/services/worldcup2026";

describe("World Cup 2026 service", () => {
  it("normalizes teams and converts iso2 to flag emoji", () => {
    const team = normalizeTeam({ id: "9", name_en: "Brazil", fifa_code: "BRA", iso2: "BR", groups: "C" });

    expect(team).toMatchObject({
      externalId: "9",
      name: "Brazil",
      fifaCode: "BRA",
      groupName: "C",
      emoji: "🇧🇷",
    });
    expect(getFlagEmoji("ENG")).toBe("🏴");
    expect(getFlagEmoji("SCO")).toBe("🏴");
    expect(getFlagEmoji("XYZ")).toBeNull();
  });

  it("normalizes game strings, booleans, dates and knockout labels", () => {
    const teams = new Map([
      ["9", normalizeTeam({ id: "9", name_en: "Brazil", fifa_code: "BRA", iso2: "BR", groups: "C" })],
    ]);
    const stadiums = new Map([
      ["1", normalizeStadium({ id: "1", name_en: "Estadio Azteca", city_en: "Mexico City" })],
    ]);

    const game = normalizeGame(
      {
        id: "73",
        home_team_id: "9",
        away_team_id: "0",
        away_team_label: "Runner-up Group B",
        home_score: "0",
        away_score: "0",
        group: "R32",
        matchday: "4",
        local_date: "06/28/2026 12:00",
        stadium_id: "1",
        finished: "FALSE",
        time_elapsed: "notstarted",
        type: "r32",
      },
      teams,
      stadiums,
    );

    expect(game.homeTeam).toBe("Brazil");
    expect(game.awayTeam).toBe("Runner-up Group B");
    expect(game.awayTeamExternalId).toBeNull();
    expect(game.matchday).toBe(4);
    expect(game.homeScore).toBe(0);
    expect(game.finished).toBe(false);
    expect(game.timeElapsed).toBe("notstarted");
    expect(game.stadiumName).toBe("Estadio Azteca");
    expect(game.startsAt).toBeInstanceOf(Date);
  });

  it("normalizes group standings", () => {
    const standings = normalizeGroup({
      group: "A",
      teams: [{ team_id: "1", mp: "1", w: "1", d: "0", l: "0", pts: "3", gf: "2", ga: "0", gd: "2" }],
    });

    expect(standings[0]).toMatchObject({
      groupName: "A",
      teamExternalId: "1",
      played: 1,
      wins: 1,
      draws: 0,
      losses: 0,
      points: 3,
      goalsFor: 2,
      goalsAgainst: 0,
      goalsDiff: 2,
    });
  });

  it("builds the global World Cup tournament", () => {
    expect(getWorldCup2026Tournament()).toMatchObject({
      id: "worldcup2026:2026",
      name: "Copa do Mundo 2026",
      slug: "copa-do-mundo-2026",
      externalSource: "worldcup2026",
      season: "2026",
    });
  });
});
