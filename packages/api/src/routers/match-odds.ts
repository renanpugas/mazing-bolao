import { db, match } from "@mazing-bolao/db";
import { ORPCError } from "@orpc/server";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";
import { requirePoolManager } from "../permissions";
import { fetchMatchOdds, fetchOddsApiEvents, normalizeOddsApiTeamName, type OddsApiEvent } from "../services/odds";

async function requirePoolWithTournament(poolId: string, userId: string) {
  const currentPool = await requirePoolManager(poolId, userId);
  const tournamentId = currentPool.tournamentId;

  if (!tournamentId) {
    throw new ORPCError("NOT_FOUND", {
      message: "Bolão não possui torneio vinculado",
    });
  }

  return {
    id: currentPool.id,
    createdByUserId: currentPool.createdByUserId,
    tournamentId,
  };
}

const matchOddsSelection = {
  id: match.id,
  tournamentId: match.tournamentId,
  homeTeam: match.homeTeam,
  awayTeam: match.awayTeam,
  homeTeamLabel: match.homeTeamLabel,
  awayTeamLabel: match.awayTeamLabel,
  homeTeamEmoji: match.homeTeamEmoji,
  awayTeamEmoji: match.awayTeamEmoji,
  startsAt: match.startsAt,
  startsAtTimeZone: match.startsAtTimeZone,
  stage: match.stage,
  groupName: match.groupName,
  matchday: match.matchday,
  oddsApiMatchId: match.oddsApiMatchId,
  oddsHomeTeam: match.oddsHomeTeam,
  oddsAwayTeam: match.oddsAwayTeam,
  oddsDraw: match.oddsDraw,
  updatedAt: match.updatedAt,
};

function utcDateKey(value: Date | string) {
  return new Date(value).toISOString().slice(0, 10);
}

function findMatchingEvent(
  currentMatch: Pick<typeof match.$inferSelect, "homeTeam" | "awayTeam" | "startsAt">,
  events: OddsApiEvent[],
) {
  const homeTeam = normalizeOddsApiTeamName(currentMatch.homeTeam);
  const awayTeam = normalizeOddsApiTeamName(currentMatch.awayTeam);
  const startsAtDay = utcDateKey(currentMatch.startsAt);

  return events.find(
    (event) =>
      normalizeOddsApiTeamName(event.homeTeam) === homeTeam &&
      normalizeOddsApiTeamName(event.awayTeam) === awayTeam &&
      utcDateKey(event.commenceTime) === startsAtDay,
  );
}

export const matchOddsRouter = {
  listForPool: protectedProcedure
    .input(
      z.object({
        poolId: z.string().trim().min(1, "Bolão é obrigatório"),
      }),
    )
    .handler(async ({ context, input }) => {
      const currentPool = await requirePoolWithTournament(input.poolId, context.session.user.id);

      return db
        .select(matchOddsSelection)
        .from(match)
        .where(eq(match.tournamentId, currentPool.tournamentId))
        .orderBy(asc(match.startsAt));
    }),
  updateForMatch: protectedProcedure
    .input(
      z.object({
        poolId: z.string().trim().min(1, "Bolão é obrigatório"),
        matchId: z.string().trim().min(1, "Partida é obrigatória"),
      }),
    )
    .handler(async ({ context, input }) => {
      const currentPool = await requirePoolWithTournament(input.poolId, context.session.user.id);

      const currentMatch = await db.query.match.findFirst({
        where: and(eq(match.id, input.matchId), eq(match.tournamentId, currentPool.tournamentId)),
        columns: { id: true, oddsApiMatchId: true },
      });

      if (!currentMatch) {
        throw new ORPCError("NOT_FOUND", {
          message: "Partida não encontrada no torneio desse bolão",
        });
      }

      if (!currentMatch.oddsApiMatchId) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Partida não possui oddsApiMatchId",
        });
      }

      const odds = await fetchMatchOdds(currentMatch.oddsApiMatchId);

      const result = await db
        .update(match)
        .set({
          oddsHomeTeam: odds.oddsHomeTeam,
          oddsAwayTeam: odds.oddsAwayTeam,
          oddsDraw: odds.oddsDraw,
          updatedAt: new Date(),
        })
        .where(eq(match.id, currentMatch.id))
        .returning(matchOddsSelection);

      return result[0];
    }),
  syncMissingMatchIds: protectedProcedure
    .input(
      z.object({
        poolId: z.string().trim().min(1, "Bolão é obrigatório"),
      }),
    )
    .handler(async ({ context, input }) => {
      const currentPool = await requirePoolWithTournament(input.poolId, context.session.user.id);
      const events = await fetchOddsApiEvents();

      const tournamentMatches = await db.query.match.findMany({
        where: eq(match.tournamentId, currentPool.tournamentId),
        columns: {
          id: true,
          homeTeam: true,
          awayTeam: true,
          startsAt: true,
          oddsApiMatchId: true,
        },
      });
      const matchesWithOddsApiIds = await db.query.match.findMany({
        columns: {
          id: true,
          oddsApiMatchId: true,
        },
      });

      const existingOddsApiMatchIds = new Map<string, string>();
      for (const currentMatch of matchesWithOddsApiIds) {
        if (currentMatch.oddsApiMatchId) {
          existingOddsApiMatchIds.set(currentMatch.oddsApiMatchId, currentMatch.id);
        }
      }

      let updatedCount = 0;
      let unmatchedCount = 0;
      let skippedExistingIdCount = 0;

      for (const currentMatch of tournamentMatches.filter((item) => item.oddsApiMatchId === null)) {
        const event = findMatchingEvent(currentMatch, events);

        if (!event) {
          unmatchedCount += 1;
          continue;
        }

        const existingMatchId = existingOddsApiMatchIds.get(event.id);
        if (existingMatchId && existingMatchId !== currentMatch.id) {
          skippedExistingIdCount += 1;
          continue;
        }

        await db
          .update(match)
          .set({
            oddsApiMatchId: event.id,
            updatedAt: new Date(),
          })
          .where(and(eq(match.id, currentMatch.id), isNull(match.oddsApiMatchId)));

        existingOddsApiMatchIds.set(event.id, currentMatch.id);
        updatedCount += 1;
      }

      return {
        updatedCount,
        unmatchedCount,
        skippedExistingIdCount,
      };
    }),
};
