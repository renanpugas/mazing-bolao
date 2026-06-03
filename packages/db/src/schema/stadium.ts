import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const stadium = sqliteTable(
  "stadium",
  {
    id: text("id").primaryKey(),
    externalSource: text("external_source").notNull(),
    externalId: text("external_id").notNull(),
    name: text("name").notNull(),
    fifaName: text("fifa_name"),
    city: text("city"),
    country: text("country"),
    capacity: integer("capacity"),
    region: text("region"),
    rawPayload: text("raw_payload", { mode: "json" }),
    lastSyncedAt: integer("last_synced_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [uniqueIndex("stadium_external_unique").on(table.externalSource, table.externalId)],
);
