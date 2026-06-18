import { db, match, tournament } from "@mazing-bolao/db";
import { eq } from "drizzle-orm";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { cleanupDatabase, createAgent, rpc, signInTestUser } from "./helpers";

describe("World Cup routes E2E", () => {
  let agent: request.Agent;

  beforeEach(() => {
    agent = createAgent();
  });

  afterEach(async () => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    await cleanupDatabase();
  });

  it("should require auth and admin to sync World Cup data", async () => {
    const unauthenticatedResponse = await rpc(agent, "worldCup/sync");
    expect(unauthenticatedResponse.status).toBe(401);

    await signInTestUser(createAgent(), { isAdmin: true });
    await signInTestUser(agent, { isAdmin: false });

    const forbiddenResponse = await rpc(agent, "worldCup/sync");
    expect(forbiddenResponse.status).toBe(403);
  });

  it("should allow admins to sync World Cup data and save last sync date", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-10T12:00:00.000Z"));

    const adminAgent = createAgent();
    await signInTestUser(adminAgent, { isAdmin: true });

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL | Request) => {
        const href = String(url);
        const data = href.includes("teams")
          ? [{ id: "9", name_en: "Brazil", fifa_code: "BRA", iso2: "BR", groups: "C" }]
          : href.includes("stadiums")
            ? [{ id: "1", name_en: "Estadio Azteca", city_en: "Mexico City" }]
            : href.includes("groups")
              ? [{ group: "C", teams: [{ team_id: "9", mp: "0", w: "0", d: "0", l: "0", pts: "0", gf: "0", ga: "0", gd: "0" }] }]
              : [{ id: "1", home_team_id: "9", away_team_id: "0", away_team_label: "A definir", local_date: "06/11/2026 13:00", stadium_id: "1", finished: "FALSE", type: "group", group: "C", matchday: "1" }];

        return { ok: true, json: async () => data };
      }),
    );

    const response = await rpc(adminAgent, "worldCup/sync");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ teams: 1, stadiums: 1, standings: 1, matches: 1 });

    const syncedTournament = await db.query.tournament.findFirst({
      where: (table, { eq }) => eq(table.id, "worldcup2026:2026"),
      columns: { lastSyncedAt: true },
    });
    expect(syncedTournament?.lastSyncedAt).toBeInstanceOf(Date);

    const syncedMatch = await db.query.match.findFirst({
      where: (table, { eq }) => eq(table.externalId, "1"),
      columns: { startsAt: true, startsAtTimeZone: true },
    });
    expect(syncedMatch?.startsAtTimeZone).toBe("America/Mexico_City");
    expect(syncedMatch?.startsAt.toISOString()).toBe("2026-06-11T19:00:00.000Z");
  });

  it("should update matches when the stored finished flag is 0 and the API marks them as finished", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-17T12:00:00.000Z"));

    const adminAgent = createAgent();
    await signInTestUser(adminAgent, { isAdmin: true });

    await db.insert(tournament).values({
      id: "worldcup2026:2026",
      name: "Copa do Mundo 2026",
      slug: "copa-do-mundo-2026",
      externalSource: "worldcup2026",
      season: "2026",
    });

    await db.insert(match).values({
      id: crypto.randomUUID(),
      tournamentId: "worldcup2026:2026",
      externalSource: "worldcup2026",
      externalId: "1",
      season: "2026",
      homeTeam: "Brazil Antigo",
      awayTeam: "Argentina Antiga",
      homeTeamLabel: "Brasil antigo",
      awayTeamLabel: "Argentina antiga",
      startsAt: new Date("2026-06-16T19:00:00.000Z"),
      startsAtTimeZone: "America/Mexico_City",
      finished: 0 as unknown as boolean,
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL | Request) => {
        const href = String(url);
        const data = href.includes("teams")
          ? [
              { id: "9", name_en: "Brazil", fifa_code: "BRA", iso2: "BR", groups: "C" },
              { id: "10", name_en: "Argentina", fifa_code: "ARG", iso2: "AR", groups: "C" },
            ]
          : href.includes("stadiums")
            ? [{ id: "1", name_en: "Estadio Azteca", city_en: "Mexico City" }]
            : href.includes("groups")
              ? [{ group: "C", teams: [{ team_id: "9", mp: "0", w: "0", d: "0", l: "0", pts: "0", gf: "0", ga: "0", gd: "0" }] }]
              : [{ id: "1", home_team_id: "9", away_team_id: "10", local_date: "06/16/2026 13:00", stadium_id: "1", finished: "TRUE", home_score: "2", away_score: "1", type: "group", group: "C", matchday: "1" }];

        return { ok: true, json: async () => data };
      }),
    );

    const response = await rpc(adminAgent, "worldCup/sync");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ matches: 1, skippedPastMatches: 0 });

    const updatedMatch = await db.query.match.findFirst({
      where: eq(match.externalId, "1"),
      columns: {
        homeTeam: true,
        awayTeam: true,
        homeScore: true,
        awayScore: true,
        finished: true,
      },
    });

    expect(updatedMatch).toMatchObject({
      homeTeam: "Brazil",
      awayTeam: "Argentina",
      homeScore: 2,
      awayScore: 1,
      finished: true,
    });
  });

  it("should update matches when the stored finished flag is false", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-17T12:00:00.000Z"));

    const adminAgent = createAgent();
    await signInTestUser(adminAgent, { isAdmin: true });

    await db.insert(tournament).values({
      id: "worldcup2026:2026",
      name: "Copa do Mundo 2026",
      slug: "copa-do-mundo-2026",
      externalSource: "worldcup2026",
      season: "2026",
    });

    await db.insert(match).values({
      id: crypto.randomUUID(),
      tournamentId: "worldcup2026:2026",
      externalSource: "worldcup2026",
      externalId: "1",
      season: "2026",
      homeTeam: "Brazil Antigo",
      awayTeam: "Argentina Antiga",
      homeTeamLabel: "Brasil antigo",
      awayTeamLabel: "Argentina antiga",
      startsAt: new Date("2026-06-16T19:00:00.000Z"),
      startsAtTimeZone: "America/Mexico_City",
      finished: false,
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL | Request) => {
        const href = String(url);
        const data = href.includes("teams")
          ? [
              { id: "9", name_en: "Brazil", fifa_code: "BRA", iso2: "BR", groups: "C" },
              { id: "10", name_en: "Argentina", fifa_code: "ARG", iso2: "AR", groups: "C" },
            ]
          : href.includes("stadiums")
            ? [{ id: "1", name_en: "Estadio Azteca", city_en: "Mexico City" }]
            : href.includes("groups")
              ? [{ group: "C", teams: [{ team_id: "9", mp: "0", w: "0", d: "0", l: "0", pts: "0", gf: "0", ga: "0", gd: "0" }] }]
              : [{ id: "1", home_team_id: "9", away_team_id: "10", local_date: "06/16/2026 13:00", stadium_id: "1", finished: "FALSE", home_score: null, away_score: null, type: "group", group: "C", matchday: "1" }];

        return { ok: true, json: async () => data };
      }),
    );

    const response = await rpc(adminAgent, "worldCup/sync");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ matches: 1, skippedPastMatches: 0 });

    const updatedMatch = await db.query.match.findFirst({
      where: eq(match.externalId, "1"),
      columns: {
        homeTeam: true,
        awayTeam: true,
        homeScore: true,
        awayScore: true,
        finished: true,
      },
    });

    expect(updatedMatch).toMatchObject({
      homeTeam: "Brazil",
      awayTeam: "Argentina",
      homeScore: null,
      awayScore: null,
      finished: false,
    });
  });

  it("should update matches when the stored finished flag is null", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-17T12:00:00.000Z"));

    const adminAgent = createAgent();
    await signInTestUser(adminAgent, { isAdmin: true });

    await db.insert(tournament).values({
      id: "worldcup2026:2026",
      name: "Copa do Mundo 2026",
      slug: "copa-do-mundo-2026",
      externalSource: "worldcup2026",
      season: "2026",
    });

    await db.insert(match).values({
      id: crypto.randomUUID(),
      tournamentId: "worldcup2026:2026",
      externalSource: "worldcup2026",
      externalId: "1",
      season: "2026",
      homeTeam: "Brazil Antigo",
      awayTeam: "Argentina Antiga",
      homeTeamLabel: "Brasil antigo",
      awayTeamLabel: "Argentina antiga",
      startsAt: new Date("2026-06-16T19:00:00.000Z"),
      startsAtTimeZone: "America/Mexico_City",
      finished: null,
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL | Request) => {
        const href = String(url);
        const data = href.includes("teams")
          ? [
              { id: "9", name_en: "Brazil", fifa_code: "BRA", iso2: "BR", groups: "C" },
              { id: "10", name_en: "Argentina", fifa_code: "ARG", iso2: "AR", groups: "C" },
            ]
          : href.includes("stadiums")
            ? [{ id: "1", name_en: "Estadio Azteca", city_en: "Mexico City" }]
            : href.includes("groups")
              ? [{ group: "C", teams: [{ team_id: "9", mp: "0", w: "0", d: "0", l: "0", pts: "0", gf: "0", ga: "0", gd: "0" }] }]
              : [{ id: "1", home_team_id: "9", away_team_id: "10", local_date: "06/16/2026 13:00", stadium_id: "1", finished: "TRUE", home_score: "2", away_score: "1", type: "group", group: "C", matchday: "1" }];

        return { ok: true, json: async () => data };
      }),
    );

    const response = await rpc(adminAgent, "worldCup/sync");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ matches: 1, skippedPastMatches: 0 });

    const updatedMatch = await db.query.match.findFirst({
      where: eq(match.externalId, "1"),
      columns: {
        homeTeam: true,
        awayTeam: true,
        homeScore: true,
        awayScore: true,
        finished: true,
      },
    });

    expect(updatedMatch).toMatchObject({
      homeTeam: "Brazil",
      awayTeam: "Argentina",
      homeScore: 2,
      awayScore: 1,
      finished: true,
    });
  });

  it("should not update matches when the stored finished flag is 1", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-17T12:00:00.000Z"));

    const adminAgent = createAgent();
    await signInTestUser(adminAgent, { isAdmin: true });

    await db.insert(tournament).values({
      id: "worldcup2026:2026",
      name: "Copa do Mundo 2026",
      slug: "copa-do-mundo-2026",
      externalSource: "worldcup2026",
      season: "2026",
    });

    await db.insert(match).values({
      id: crypto.randomUUID(),
      tournamentId: "worldcup2026:2026",
      externalSource: "worldcup2026",
      externalId: "1",
      season: "2026",
      homeTeam: "Brazil Atual",
      awayTeam: "Argentina Atual",
      homeTeamLabel: "Brasil atual",
      awayTeamLabel: "Argentina atual",
      startsAt: new Date("2026-06-16T19:00:00.000Z"),
      startsAtTimeZone: "America/Mexico_City",
      homeScore: 1,
      awayScore: 0,
      finished: 1 as unknown as boolean,
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL | Request) => {
        const href = String(url);
        const data = href.includes("teams")
          ? [
              { id: "9", name_en: "Brazil", fifa_code: "BRA", iso2: "BR", groups: "C" },
              { id: "10", name_en: "Argentina", fifa_code: "ARG", iso2: "AR", groups: "C" },
            ]
          : href.includes("stadiums")
            ? [{ id: "1", name_en: "Estadio Azteca", city_en: "Mexico City" }]
            : href.includes("groups")
              ? [{ group: "C", teams: [{ team_id: "9", mp: "0", w: "0", d: "0", l: "0", pts: "0", gf: "0", ga: "0", gd: "0" }] }]
              : [{ id: "1", home_team_id: "9", away_team_id: "10", local_date: "06/16/2026 13:00", stadium_id: "1", finished: "TRUE", home_score: "2", away_score: "1", type: "group", group: "C", matchday: "1" }];

        return { ok: true, json: async () => data };
      }),
    );

    const response = await rpc(adminAgent, "worldCup/sync");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ matches: 0, skippedPastMatches: 1 });

    const unchangedMatch = await db.query.match.findFirst({
      where: eq(match.externalId, "1"),
      columns: {
        homeTeam: true,
        awayTeam: true,
        homeScore: true,
        awayScore: true,
        finished: true,
      },
    });

    expect(unchangedMatch).toMatchObject({
      homeTeam: "Brazil Atual",
      awayTeam: "Argentina Atual",
      homeScore: 1,
      awayScore: 0,
      finished: true,
    });
  });
});
