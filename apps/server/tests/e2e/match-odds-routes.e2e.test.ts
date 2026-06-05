import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { db, match, pool, poolUser, tournament } from "@mazing-bolao/db";
import { eq } from "drizzle-orm";

import { cleanupDatabase, createAgent, rpc, signInTestUser } from "./helpers";

describe("Match odds routes E2E", () => {
  let agent: request.Agent;

  beforeEach(() => {
    agent = createAgent();
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await cleanupDatabase();
  });

  async function createFixture() {
    const ownerAgent = createAgent();
    const participantAgent = createAgent();
    const owner = await signInTestUser(ownerAgent, { name: "Owner" });
    const participant = await signInTestUser(participantAgent, { name: "Participant" });
    const tournamentId = crypto.randomUUID();
    const poolId = crypto.randomUUID();
    const matchId = crypto.randomUUID();
    const matchWithoutOddsId = crypto.randomUUID();

    await db.insert(tournament).values({
      id: tournamentId,
      name: "World Cup 2026",
      slug: `world-cup-${crypto.randomUUID()}`,
    });
    await db.insert(pool).values({
      id: poolId,
      name: "Bolão da Copa",
      createdByUserId: owner.id,
      tournamentId,
    });
    await db.insert(poolUser).values([
      { id: crypto.randomUUID(), poolId, userId: owner.id },
      { id: crypto.randomUUID(), poolId, userId: participant.id },
    ]);
    await db.insert(match).values([
      {
        id: matchId,
        tournamentId,
        homeTeam: "Brazil",
        awayTeam: "Morocco",
        startsAt: new Date("2026-06-20T19:00:00.000Z"),
        oddsApiMatchId: "odds-event-1",
        oddsHomeTeam: 1.95,
        oddsAwayTeam: 3.8,
        oddsDraw: 3.2,
      },
      {
        id: matchWithoutOddsId,
        tournamentId,
        homeTeam: "Canada",
        awayTeam: "Qatar",
        startsAt: new Date("2026-06-21T19:00:00.000Z"),
      },
    ]);

    return { ownerAgent, participantAgent, tournamentId, poolId, matchId, matchWithoutOddsId };
  }

  function mockEventsFetch(events: unknown[]) {
    const fetchMock = vi.fn(async (input: URL | string) => {
      const url = new URL(input.toString());
      expect(url.origin).toBe("https://api.the-odds-api.com");
      expect(url.pathname).toBe("/v4/sports/soccer_fifa_world_cup/events");
      expect(url.searchParams.get("apiKey")).toBe("test-odds-api-key");

      return Response.json(events);
    });
    vi.stubGlobal("fetch", fetchMock);

    return fetchMock;
  }

  it("should require auth for match odds endpoints", async () => {
    const listResponse = await rpc(agent, "matchOdds/listForPool", { poolId: crypto.randomUUID() });
    expect(listResponse.status).toBe(401);

    const updateResponse = await rpc(agent, "matchOdds/updateForMatch", {
      poolId: crypto.randomUUID(),
      matchId: crypto.randomUUID(),
    });
    expect(updateResponse.status).toBe(401);

    const syncResponse = await rpc(agent, "matchOdds/syncMissingMatchIds", { poolId: crypto.randomUUID() });
    expect(syncResponse.status).toBe(401);
  });

  it("should forbid participants that are not the pool creator", async () => {
    const { participantAgent, poolId, matchId } = await createFixture();

    const listResponse = await rpc(participantAgent, "matchOdds/listForPool", { poolId });
    expect(listResponse.status).toBe(403);

    const updateResponse = await rpc(participantAgent, "matchOdds/updateForMatch", { poolId, matchId });
    expect(updateResponse.status).toBe(403);

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const syncResponse = await rpc(participantAgent, "matchOdds/syncMissingMatchIds", { poolId });
    expect(syncResponse.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("should list tournament matches with current odds for the pool creator", async () => {
    const { ownerAgent, poolId, matchId } = await createFixture();

    const response = await rpc(ownerAgent, "matchOdds/listForPool", { poolId });

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body[0]).toMatchObject({
      id: matchId,
      homeTeam: "Brazil",
      awayTeam: "Morocco",
      oddsApiMatchId: "odds-event-1",
      oddsHomeTeam: 1.95,
      oddsAwayTeam: 3.8,
      oddsDraw: 3.2,
    });
  });

  it("should update one match from mocked The Odds API odds", async () => {
    const { ownerAgent, poolId, matchId } = await createFixture();
    const fetchMock = vi.fn(async (input: URL | string) => {
      const url = new URL(input.toString());
      expect(url.origin).toBe("https://api.the-odds-api.com");
      expect(url.pathname).toBe("/v4/sports/soccer_fifa_world_cup/events/odds-event-1/odds");
      expect(url.searchParams.get("apiKey")).toBe("test-odds-api-key");
      expect(url.searchParams.get("regions")).toBe("us");
      expect(url.searchParams.get("oddsFormat")).toBe("decimal");
      expect(url.searchParams.get("bookmakers")).toBe("fanduel");
      expect(url.searchParams.get("markets")).toBe("h2h");

      return Response.json({
        id: "odds-event-1",
        home_team: "Brazil",
        away_team: "Morocco",
        bookmakers: [
          {
            key: "fanduel",
            markets: [
              {
                key: "h2h",
                outcomes: [
                  { name: "Brazil", price: 1.7 },
                  { name: "Morocco", price: 5.1 },
                  { name: "Draw", price: 3.6 },
                ],
              },
            ],
          },
        ],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await rpc(ownerAgent, "matchOdds/updateForMatch", { poolId, matchId });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: matchId,
      oddsHomeTeam: 1.7,
      oddsAwayTeam: 5.1,
      oddsDraw: 3.6,
    });

    const updatedMatch = await db.query.match.findFirst({ where: eq(match.id, matchId) });
    expect(updatedMatch?.oddsHomeTeam).toBe(1.7);
    expect(updatedMatch?.oddsAwayTeam).toBe(5.1);
    expect(updatedMatch?.oddsDraw).toBe(3.6);
  });

  it("should reject a match without oddsApiMatchId without calling fetch", async () => {
    const { ownerAgent, poolId, matchWithoutOddsId } = await createFixture();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await rpc(ownerAgent, "matchOdds/updateForMatch", { poolId, matchId: matchWithoutOddsId });

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("should sync a missing oddsApiMatchId when teams and UTC day match", async () => {
    const { ownerAgent, poolId, matchWithoutOddsId } = await createFixture();
    const fetchMock = mockEventsFetch([
      {
        id: "odds-event-2",
        home_team: "Canada",
        away_team: "Qatar",
        commence_time: "2026-06-21T22:30:00Z",
      },
    ]);

    const response = await rpc(ownerAgent, "matchOdds/syncMissingMatchIds", { poolId });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      updatedCount: 1,
      unmatchedCount: 0,
      skippedExistingIdCount: 0,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const updatedMatch = await db.query.match.findFirst({ where: eq(match.id, matchWithoutOddsId) });
    expect(updatedMatch?.oddsApiMatchId).toBe("odds-event-2");
  });

  it("should not update matches that already have oddsApiMatchId", async () => {
    const { ownerAgent, poolId, matchId } = await createFixture();
    mockEventsFetch([
      {
        id: "new-brazil-event",
        home_team: "Brazil",
        away_team: "Morocco",
        commence_time: "2026-06-20T19:00:00Z",
      },
    ]);

    const response = await rpc(ownerAgent, "matchOdds/syncMissingMatchIds", { poolId });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      updatedCount: 0,
      unmatchedCount: 1,
      skippedExistingIdCount: 0,
    });

    const unchangedMatch = await db.query.match.findFirst({ where: eq(match.id, matchId) });
    expect(unchangedMatch?.oddsApiMatchId).toBe("odds-event-1");
  });

  it("should match Odds API team aliases when syncing missing ids", async () => {
    const { ownerAgent, tournamentId, poolId } = await createFixture();
    const aliasMatchId = crypto.randomUUID();
    await db.insert(match).values({
      id: aliasMatchId,
      tournamentId,
      homeTeam: "USA",
      awayTeam: "DR Congo",
      startsAt: new Date("2026-06-22T00:30:00.000Z"),
    });
    mockEventsFetch([
      {
        id: "alias-event",
        home_team: "United States",
        away_team: "Democratic Republic of the Congo",
        commence_time: "2026-06-22T03:00:00Z",
      },
    ]);

    const response = await rpc(ownerAgent, "matchOdds/syncMissingMatchIds", { poolId });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      updatedCount: 1,
      unmatchedCount: 1,
      skippedExistingIdCount: 0,
    });

    const updatedMatch = await db.query.match.findFirst({ where: eq(match.id, aliasMatchId) });
    expect(updatedMatch?.oddsApiMatchId).toBe("alias-event");
  });

  it("should skip a matched event id that already exists on another match", async () => {
    const { ownerAgent, poolId, matchWithoutOddsId } = await createFixture();
    mockEventsFetch([
      {
        id: "odds-event-1",
        home_team: "Canada",
        away_team: "Qatar",
        commence_time: "2026-06-21T19:00:00Z",
      },
    ]);

    const response = await rpc(ownerAgent, "matchOdds/syncMissingMatchIds", { poolId });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      updatedCount: 0,
      unmatchedCount: 0,
      skippedExistingIdCount: 1,
    });

    const unchangedMatch = await db.query.match.findFirst({ where: eq(match.id, matchWithoutOddsId) });
    expect(unchangedMatch?.oddsApiMatchId).toBeNull();
  });

  it.each([
    {
      name: "missing draw outcome",
      payload: {
        id: "odds-event-1",
        home_team: "Brazil",
        away_team: "Morocco",
        bookmakers: [
          {
            key: "fanduel",
            markets: [
              {
                key: "h2h",
                outcomes: [
                  { name: "Brazil", price: 1.7 },
                  { name: "Morocco", price: 5.1 },
                ],
              },
            ],
          },
        ],
      },
    },
    {
      name: "missing bookmaker",
      payload: {
        id: "odds-event-1",
        home_team: "Brazil",
        away_team: "Morocco",
        bookmakers: [],
      },
    },
    {
      name: "missing h2h market",
      payload: {
        id: "odds-event-1",
        home_team: "Brazil",
        away_team: "Morocco",
        bookmakers: [
          {
            key: "fanduel",
            markets: [],
          },
        ],
      },
    },
  ])("should reject incomplete odds responses without partial updates: $name", async ({ payload }) => {
    const { ownerAgent, poolId, matchId } = await createFixture();
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(payload)));

    const response = await rpc(ownerAgent, "matchOdds/updateForMatch", { poolId, matchId });

    expect(response.status).toBe(502);
    const unchangedMatch = await db.query.match.findFirst({ where: eq(match.id, matchId) });
    expect(unchangedMatch?.oddsHomeTeam).toBe(1.95);
    expect(unchangedMatch?.oddsAwayTeam).toBe(3.8);
    expect(unchangedMatch?.oddsDraw).toBe(3.2);
  });
});
