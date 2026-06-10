import { createClient } from "@libsql/client";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

import { seedTables } from "./seed-data.mjs";

if (!process.env.DATABASE_URL) {
  dotenv.config({
    path: fileURLToPath(new URL("../../../apps/server/.env", import.meta.url)),
  });
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run the database seed.");
}

const db = createClient({ url: databaseUrl });

function quoteIdentifier(identifier) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

try {
  let inserted = 0;

  for (const { table, rows } of seedTables) {
    for (const row of rows) {
      const entries = Object.entries(row);
      const columns = entries.map(([column]) => quoteIdentifier(column)).join(", ");
      const placeholders = entries.map(() => "?").join(", ");

      await db.execute({
        sql: `insert into ${quoteIdentifier(table)} (${columns}) values (${placeholders}) on conflict do nothing`,
        args: entries.map(([, value]) => value),
      });

      inserted += 1;
    }

    console.log(`Seeded ${rows.length} row(s) into ${table}.`);
  }

  console.log(`Database seed finished. Processed ${inserted} row(s).`);
} finally {
  db.close();
}
