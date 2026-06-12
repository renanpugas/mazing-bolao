import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";

import { tournament } from "./tournament";

export const match = sqliteTable(
  "match",
  {
    id: text("id").primaryKey(),
    tournamentId: text("tournament_id")
      .notNull()
      .references(() => tournament.id, { onDelete: "cascade" }),
    homeTeam: text("home_team").notNull(),
    awayTeam: text("away_team").notNull(),
    startsAt: integer("starts_at", { mode: "timestamp_ms" }).notNull(),
    startsAtTimeZone: text("starts_at_timezone"),
    externalSource: text("external_source"),
    externalId: text("external_id"),
    oddsApiMatchId: text("odds_api_match_id"),
    oddsHomeTeam: real("odds_home_team"),
    oddsAwayTeam: real("odds_away_team"),
    oddsDraw: real("odds_draw"),
    season: text("season"),
    stage: text("stage"),
    groupName: text("group_name"),
    matchday: integer("matchday"),
    homeTeamExternalId: text("home_team_external_id"),
    awayTeamExternalId: text("away_team_external_id"),
    homeTeamLabel: text("home_team_label"),
    awayTeamLabel: text("away_team_label"),
    homeTeamEmoji: text("home_team_emoji"),
    awayTeamEmoji: text("away_team_emoji"),
    homeTeamFifaRankingPosition: integer("home_team_fifa_ranking_position"),
    awayTeamFifaRankingPosition: integer("away_team_fifa_ranking_position"),
    stadiumExternalId: text("stadium_external_id"),
    stadiumName: text("stadium_name"),
    stadiumCity: text("stadium_city"),
    homeScore: integer("home_score"),
    awayScore: integer("away_score"),
    finished: integer("finished", { mode: "boolean" }),
    timeElapsed: text("time_elapsed"),
    rawPayload: text("raw_payload", { mode: "json" }),
    lastSyncedAt: integer("last_synced_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("match_tournament_external_unique").on(
      table.tournamentId,
      table.externalSource,
      table.externalId,
    ),
    uniqueIndex("match_odds_api_match_id_unique").on(table.oddsApiMatchId),
  ],
);
