import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";

import { pool } from "./pool";

export const match = sqliteTable(
  "match",
  {
    id: text("id").primaryKey(),
    poolId: text("pool_id")
      .notNull()
      .references(() => pool.id, { onDelete: "cascade" }),
    homeTeam: text("home_team").notNull(),
    awayTeam: text("away_team").notNull(),
    startsAt: integer("starts_at", { mode: "timestamp_ms" }).notNull(),
    externalSource: text("external_source"),
    externalId: text("external_id"),
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
  (table) => [uniqueIndex("match_pool_external_unique").on(table.poolId, table.externalSource, table.externalId)],
);
