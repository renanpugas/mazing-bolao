import { migrate } from "drizzle-orm/libsql/migrator";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const dbFilePath = path.resolve(process.cwd(), ".tmp", `e2e-${Date.now()}-${randomUUID()}.db`);
const databaseUrl = `file:${dbFilePath}`;
fs.mkdirSync(path.dirname(dbFilePath), { recursive: true });

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = databaseUrl;
process.env.BETTER_AUTH_SECRET = "test-secret-with-at-least-32-characters";
process.env.BETTER_AUTH_URL = "http://localhost:3009";

async function runMigrations() {
  const client = createClient({
    url: databaseUrl,
  });

  const db = drizzle(client);

  await migrate(db, {
    migrationsFolder: path.resolve(process.cwd(), "../../packages/db/src/migrations"),
  });

  await client.close();
}

await runMigrations();

process.on("exit", () => {
  try {
    fs.rmSync(dbFilePath, { force: true });
    fs.rmSync(`${dbFilePath}-shm`, { force: true });
    fs.rmSync(`${dbFilePath}-wal`, { force: true });
  } catch {
    // no-op
  }
});
