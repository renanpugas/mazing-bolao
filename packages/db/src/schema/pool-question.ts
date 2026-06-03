import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { user } from "./auth";
import { pool } from "./pool";
import { poolUser } from "./pool-user";

export const poolQuestion = sqliteTable("pool_question", {
  id: text("id").primaryKey(),
  poolId: text("pool_id")
    .notNull()
    .references(() => pool.id, { onDelete: "cascade" }),
  createdByUserId: text("created_by_user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  points: integer("points").notNull(),
  closesAt: integer("closes_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const poolQuestionAnswer = sqliteTable(
  "pool_question_answer",
  {
    id: text("id").primaryKey(),
    questionId: text("question_id")
      .notNull()
      .references(() => poolQuestion.id, { onDelete: "cascade" }),
    poolId: text("pool_id")
      .notNull()
      .references(() => pool.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    poolUserId: text("pool_user_id").references(() => poolUser.id, { onDelete: "set null" }),
    answer: text("answer").notNull(),
    isCorrect: integer("is_correct", { mode: "boolean" }),
    reviewedByUserId: text("reviewed_by_user_id").references(() => user.id, { onDelete: "set null" }),
    reviewedAt: integer("reviewed_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [uniqueIndex("pool_question_answer_question_user_unique").on(table.questionId, table.userId)],
);
