import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { pool } from "./pool";

export const poolMatchScoringRule = sqliteTable(
  "pool_match_scoring_rule",
  {
    id: text("id").primaryKey(),
    poolId: text("pool_id")
      .notNull()
      .references(() => pool.id, { onDelete: "cascade" }),
    stage: text("stage").notNull(),
    exactScorePoints: integer("exact_score_points").notNull(),
    outcomePoints: integer("outcome_points").notNull(),
    brazilMultiplier: integer("brazil_multiplier").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [uniqueIndex("pool_match_scoring_rule_pool_stage_unique").on(table.poolId, table.stage)],
);
