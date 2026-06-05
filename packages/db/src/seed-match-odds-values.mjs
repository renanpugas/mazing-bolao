import { createClient } from "@libsql/client";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

dotenv.config({
  path: fileURLToPath(new URL("../../../apps/server/.env", import.meta.url)),
});

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run the match odds values seed.");
}

const tournamentId = process.env.MATCH_ODDS_SEED_TOURNAMENT_ID ?? "worldcup2026:2026";
const db = createClient({ url: databaseUrl });

const matchOddsMappings = [
  { externalId: "1", oddsHomeTeam: 1.38, oddsAwayTeam: 8, oddsDraw: 4.6 },
  { externalId: "2", oddsHomeTeam: 2.65, oddsAwayTeam: 2.85, oddsDraw: 3 },
  { externalId: "3", oddsHomeTeam: 1.8, oddsAwayTeam: 4.7, oddsDraw: 3.6 },
  { externalId: "4", oddsHomeTeam: 1.95, oddsAwayTeam: 4, oddsDraw: 3.4 },
  { externalId: "8", oddsHomeTeam: 14, oddsAwayTeam: 1.21, oddsDraw: 6.5 },
  { externalId: "7", oddsHomeTeam: 1.61, oddsAwayTeam: 5.9, oddsDraw: 3.8 },
  { externalId: "5", oddsHomeTeam: 6.5, oddsAwayTeam: 1.48, oddsDraw: 4.5 },
  { externalId: "6", oddsHomeTeam: 5.2, oddsAwayTeam: 1.74, oddsDraw: 3.5 },
  { externalId: "10", oddsHomeTeam: 1.05, oddsAwayTeam: 46, oddsDraw: 18 },
  { externalId: "11", oddsHomeTeam: 1.95, oddsAwayTeam: 3.8, oddsDraw: 3.6 },
  { externalId: "9", oddsHomeTeam: 3.7, oddsAwayTeam: 2.35, oddsDraw: 2.8 },
  { externalId: "12", oddsHomeTeam: 1.91, oddsAwayTeam: 4.3, oddsDraw: 3.3 },
  { externalId: "14", oddsHomeTeam: 1.08, oddsAwayTeam: 28, oddsDraw: 11 },
  { externalId: "15", oddsHomeTeam: 1.65, oddsAwayTeam: 5.5, oddsDraw: 3.9 },
  { externalId: "13", oddsHomeTeam: 1.91, oddsAwayTeam: 4.3, oddsDraw: 3.4 },
  { externalId: "16", oddsHomeTeam: 7, oddsAwayTeam: 1.45, oddsDraw: 4.4 },
  { externalId: "17", oddsHomeTeam: 1.42, oddsAwayTeam: 7, oddsDraw: 4.7 },
  { externalId: "18", oddsHomeTeam: 13, oddsAwayTeam: 1.2, oddsDraw: 6.5 },
  { externalId: "19", oddsHomeTeam: 1.37, oddsAwayTeam: 9.5, oddsDraw: 4.6 },
  { externalId: "20", oddsHomeTeam: 1.31, oddsAwayTeam: 9.5, oddsDraw: 5.6 },
  { externalId: "21", oddsHomeTeam: 1.25, oddsAwayTeam: 12, oddsDraw: 6 },
  { externalId: "22", oddsHomeTeam: 1.71, oddsAwayTeam: 5, oddsDraw: 3.7 },
  { externalId: "24", oddsHomeTeam: 2.05, oddsAwayTeam: 3.7, oddsDraw: 3.4 },
  { externalId: "23", oddsHomeTeam: 8.5, oddsAwayTeam: 1.38, oddsDraw: 4.7 },
];

try {
  const missingMatches = [];
  let updated = 0;

  for (const mapping of matchOddsMappings) {
    const result = await db.execute({
      sql: `
        update match
        set odds_home_team = ?, odds_away_team = ?, odds_draw = ?
        where tournament_id = ? and external_id = ?
      `,
      args: [
        mapping.oddsHomeTeam,
        mapping.oddsAwayTeam,
        mapping.oddsDraw,
        tournamentId,
        mapping.externalId,
      ],
    });

    if (result.rowsAffected === 0) {
      missingMatches.push(mapping.externalId);
      continue;
    }

    updated += result.rowsAffected;
  }

  if (missingMatches.length > 0) {
    throw new Error(`Could not find ${missingMatches.length} match(es) by external_id: ${missingMatches.join(", ")}`);
  }

  console.log(`Updated ${updated} match row(s) with odds values.`);
} finally {
  db.close();
}
