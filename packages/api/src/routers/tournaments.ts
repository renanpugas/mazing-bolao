import { db, tournament } from "@mazing-bolao/db";
import { asc } from "drizzle-orm";

import { protectedProcedure } from "../index";

export const tournamentsRouter = {
  list: protectedProcedure.handler(async () => {
    return db
      .select({
        id: tournament.id,
        name: tournament.name,
        slug: tournament.slug,
        externalSource: tournament.externalSource,
        season: tournament.season,
        startsAt: tournament.startsAt,
        endsAt: tournament.endsAt,
        lastSyncedAt: tournament.lastSyncedAt,
      })
      .from(tournament)
      .orderBy(asc(tournament.startsAt));
  }),
};
