import { createClient } from "@libsql/client";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

dotenv.config({
  path: fileURLToPath(new URL("../../../apps/server/.env", import.meta.url)),
});

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run the Odds API match id seed.");
}

const tournamentId = process.env.ODDS_API_SEED_TOURNAMENT_ID ?? "worldcup2026:2026";
const db = createClient({ url: databaseUrl });

const oddsApiMatchMappings = [
  { homeTeam: "Mexico", awayTeam: "South Africa", oddsApiMatchId: "80d82d1113934bfbea4ce8daf37a2433" },
  { homeTeam: "South Korea", awayTeam: "Czech Republic", oddsApiMatchId: "384cbb5d76b535896a24fe65f93cfac8" },
  { homeTeam: "Canada", awayTeam: "Bosnia & Herzegovina", oddsApiMatchId: "d1f4f946c70a0b4e81f5d43e9d32361c" },
  { homeTeam: "USA", awayTeam: "Paraguay", oddsApiMatchId: "c12986f447a515fbe641addd786dbb24" },
  { homeTeam: "Qatar", awayTeam: "Switzerland", oddsApiMatchId: "26634922d3f78c146440816023e40de8" },
  { homeTeam: "Brazil", awayTeam: "Morocco", oddsApiMatchId: "f6c8748a16516e0998f95de14235432a" },
  { homeTeam: "Haiti", awayTeam: "Scotland", oddsApiMatchId: "5ae41a06735c926eeb7f74006933adce" },
  { homeTeam: "Australia", awayTeam: "Turkey", oddsApiMatchId: "564084f52cc9f1abcc18187c168a7cdc" },
  { homeTeam: "Germany", awayTeam: "Curaçao", oddsApiMatchId: "d79edbd6aaeb578d33e313446b18d333" },
  { homeTeam: "Netherlands", awayTeam: "Japan", oddsApiMatchId: "32ec06abda2398ac41501c86eb9aa376" },
  { homeTeam: "Ivory Coast", awayTeam: "Ecuador", oddsApiMatchId: "05752bb341e197001387b64f3a06b9b2" },
  { homeTeam: "Sweden", awayTeam: "Tunisia", oddsApiMatchId: "b55f9569de3f4d731bc5537ff5ff43e4" },
  { homeTeam: "Spain", awayTeam: "Cape Verde", oddsApiMatchId: "c54f00b11925751d2b62988775c6c239" },
  { homeTeam: "Belgium", awayTeam: "Egypt", oddsApiMatchId: "fbfb95c62003fd6d828b309f96ee1f9b" },
  { homeTeam: "Saudi Arabia", awayTeam: "Uruguay", oddsApiMatchId: "64b91c5f2db61c7358a4f05459e83c52" },
  { homeTeam: "Iran", awayTeam: "New Zealand", oddsApiMatchId: "ec51b9c44ad5e34552f3ab53f7262813" },
  { homeTeam: "France", awayTeam: "Senegal", oddsApiMatchId: "73a4fcd14cc9766b9b9bfd50b8ca153a" },
  { homeTeam: "Iraq", awayTeam: "Norway", oddsApiMatchId: "4d4f2b9b78182b557d4fbf8dcf4f4af2" },
  { homeTeam: "Argentina", awayTeam: "Algeria", oddsApiMatchId: "f31b2ee9e1cc6f7e641467f8237eaa21" },
  { homeTeam: "Austria", awayTeam: "Jordan", oddsApiMatchId: "25161cf6cf0cd9be17ae2e7e224a1f45" },
  { homeTeam: "Portugal", awayTeam: "DR Congo", oddsApiMatchId: "6cc871c121a1869b4612d3fb22fa9d55" },
  { homeTeam: "England", awayTeam: "Croatia", oddsApiMatchId: "689096c8cd7e2753b9fec95321943c5d" },
  { homeTeam: "Ghana", awayTeam: "Panama", oddsApiMatchId: "87afdb85c977b451e1c00f5e3e632601" },
  { homeTeam: "Uzbekistan", awayTeam: "Colombia", oddsApiMatchId: "22083e7a8e5362c711bc05c1e1319a1f" },
  { homeTeam: "Czech Republic", awayTeam: "South Africa", oddsApiMatchId: "66ebb9e3f949caded535d97ce686ca09" },
  { homeTeam: "Switzerland", awayTeam: "Bosnia & Herzegovina", oddsApiMatchId: "289bc2e9f5adad8ae4d9a75a7c5461ad" },
  { homeTeam: "Canada", awayTeam: "Qatar", oddsApiMatchId: "fa9502285b257b03e62968d50d9229fc" },
  { homeTeam: "Mexico", awayTeam: "South Korea", oddsApiMatchId: "0f2aeae6ac8e77223848d23a4ca86b0d" },
  { homeTeam: "USA", awayTeam: "Australia", oddsApiMatchId: "065b3573e875f8d23803357f73e5b99e" },
  { homeTeam: "Scotland", awayTeam: "Morocco", oddsApiMatchId: "4cd769aa7bae0ad9762bd69b80ef2903" },
  { homeTeam: "Brazil", awayTeam: "Haiti", oddsApiMatchId: "ef0f74a991d3e35798ae5af77667bce1" },
  { homeTeam: "Turkey", awayTeam: "Paraguay", oddsApiMatchId: "f955d4b3395ce6e3b5ac1031ca52ca4e" },
  { homeTeam: "Netherlands", awayTeam: "Sweden", oddsApiMatchId: "4f0c518545b0096c68326daf25bffc1e" },
  { homeTeam: "Germany", awayTeam: "Ivory Coast", oddsApiMatchId: "f1ab0f69832972a329243522ceaa7804" },
  { homeTeam: "Ecuador", awayTeam: "Curaçao", oddsApiMatchId: "681895f294b670b4c7b14495dfb583bc" },
  { homeTeam: "Tunisia", awayTeam: "Japan", oddsApiMatchId: "dfc5202cf1b8ae002cf952cd04f235b9" },
  { homeTeam: "Spain", awayTeam: "Saudi Arabia", oddsApiMatchId: "73529a242e319a86bf3d00ddb4accc37" },
  { homeTeam: "Belgium", awayTeam: "Iran", oddsApiMatchId: "5f92f257386ec5bf7c6e2498a21f3a61" },
  { homeTeam: "Uruguay", awayTeam: "Cape Verde", oddsApiMatchId: "852a3abe6d46820720febc0fedebff9a" },
  { homeTeam: "New Zealand", awayTeam: "Egypt", oddsApiMatchId: "c1ec9a65f4b4cf74477b368a7d6282de" },
  { homeTeam: "Argentina", awayTeam: "Austria", oddsApiMatchId: "be6c63f416c67bca1300a98f5b89c3af" },
  { homeTeam: "France", awayTeam: "Iraq", oddsApiMatchId: "7ad7a0ce2ef2618bb59b066da5642f70" },
  { homeTeam: "Norway", awayTeam: "Senegal", oddsApiMatchId: "3f48473742ca0fd2a85930554720c75e" },
  { homeTeam: "Jordan", awayTeam: "Algeria", oddsApiMatchId: "fd8533b650e655030f6a7946f8795db2" },
  { homeTeam: "Portugal", awayTeam: "Uzbekistan", oddsApiMatchId: "8ba93d190f1f934e33862a97a6353a6e" },
  { homeTeam: "England", awayTeam: "Ghana", oddsApiMatchId: "2f49dd8deae3079dc4eb2d634d18a99c" },
  { homeTeam: "Panama", awayTeam: "Croatia", oddsApiMatchId: "c1bc8c26480cd42b89a0de5329581314" },
  { homeTeam: "Colombia", awayTeam: "DR Congo", oddsApiMatchId: "68bfc965eb267508e04d8e8d75c1a0ae" },
  { homeTeam: "Bosnia & Herzegovina", awayTeam: "Qatar", oddsApiMatchId: "512ac18beb5aa936a59f7ea3e497ada2" },
  { homeTeam: "Switzerland", awayTeam: "Canada", oddsApiMatchId: "c9ef5822ee64fd5275f7c73251bb56c7" },
  { homeTeam: "Scotland", awayTeam: "Brazil", oddsApiMatchId: "885ba95805db310a7bcc3fb1a7a6dd28" },
  { homeTeam: "Morocco", awayTeam: "Haiti", oddsApiMatchId: "d1279ce7f33136a33e99ad442fc855e8" },
  { homeTeam: "Czech Republic", awayTeam: "Mexico", oddsApiMatchId: "5993bd5196ca09f83990f0c3261e442e" },
  { homeTeam: "South Africa", awayTeam: "South Korea", oddsApiMatchId: "c0355dfc6e26ec327e379b6ef5824a5f" },
  { homeTeam: "Curaçao", awayTeam: "Ivory Coast", oddsApiMatchId: "a5a0b544a984ab16e564264f3e859b43" },
  { homeTeam: "Ecuador", awayTeam: "Germany", oddsApiMatchId: "0ec28b84ec399bd4dffbe8d1bc72b3c4" },
  { homeTeam: "Japan", awayTeam: "Sweden", oddsApiMatchId: "0ed0233bddc4eafc8507f86a9c17b998" },
  { homeTeam: "Tunisia", awayTeam: "Netherlands", oddsApiMatchId: "f3c4657daa143a0c5bd62cb370d01ce4" },
  { homeTeam: "Paraguay", awayTeam: "Australia", oddsApiMatchId: "22f6ac06dfcc88a847920f62633e6459" },
  { homeTeam: "Turkey", awayTeam: "USA", oddsApiMatchId: "f41aeac9a8343a84b4950f15ea25fba2" },
  { homeTeam: "Norway", awayTeam: "France", oddsApiMatchId: "b86b4d60f773e9e3c46c00e9a6496e79" },
  { homeTeam: "Senegal", awayTeam: "Iraq", oddsApiMatchId: "7e6aee294ea1a4792c59558791084528" },
  { homeTeam: "Cape Verde", awayTeam: "Saudi Arabia", oddsApiMatchId: "e07b1926be5a4d515c7eb108dbcee9c5" },
  { homeTeam: "Uruguay", awayTeam: "Spain", oddsApiMatchId: "dcff2e31c0bce001a4db5caaf4fa8822" },
  { homeTeam: "New Zealand", awayTeam: "Belgium", oddsApiMatchId: "581691da05dcd75b5c6d3be91ee9d2ab" },
  { homeTeam: "Egypt", awayTeam: "Iran", oddsApiMatchId: "3e3b5fa2b3c963e74cf044c60db0b573" },
  { homeTeam: "Croatia", awayTeam: "Ghana", oddsApiMatchId: "537c0997cd899394f47f16545b7068b2" },
  { homeTeam: "Panama", awayTeam: "England", oddsApiMatchId: "4be17c8e1ccfecb0f2a5ef79e045c415" },
  { homeTeam: "Colombia", awayTeam: "Portugal", oddsApiMatchId: "67ae5751c401a98409b8566ae4897069" },
  { homeTeam: "DR Congo", awayTeam: "Uzbekistan", oddsApiMatchId: "13eab94a136b9c264ba974cf437a5f71" },
  { homeTeam: "Algeria", awayTeam: "Austria", oddsApiMatchId: "8756200e539155e571557c4f2e0d7f05" },
  { homeTeam: "Jordan", awayTeam: "Argentina", oddsApiMatchId: "54697f453437ab26276d773be1d72e9b" },
];

const teamNameAliases = new Map([
  ["usa", "united states"],
  ["dr congo", "democratic republic of the congo"],
  ["democratic republic congo", "democratic republic of the congo"],
  ["bosnia herzegovina", "bosnia and herzegovina"],
]);

function normalizeTeamName(teamName) {
  const normalized = teamName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  return teamNameAliases.get(normalized) ?? normalized;
}

function matchKey(homeTeam, awayTeam) {
  return `${normalizeTeamName(homeTeam)}::${normalizeTeamName(awayTeam)}`;
}

try {
  const dbMatchesResult = await db.execute({
    sql: "select id, home_team, away_team from match where tournament_id = ?",
    args: [tournamentId],
  });

  const matchesByTeamName = new Map();

  for (const row of dbMatchesResult.rows) {
    const key = matchKey(row.home_team, row.away_team);

    if (matchesByTeamName.has(key)) {
      throw new Error(`More than one match found for ${row.home_team} vs ${row.away_team}.`);
    }

    matchesByTeamName.set(key, row);
  }

  const unmatchedGames = [];
  const updates = [];

  for (const mapping of oddsApiMatchMappings) {
    const match = matchesByTeamName.get(matchKey(mapping.homeTeam, mapping.awayTeam));

    if (!match) {
      unmatchedGames.push(`${mapping.homeTeam} vs ${mapping.awayTeam}`);
      continue;
    }

    updates.push({ matchId: match.id, oddsApiMatchId: mapping.oddsApiMatchId });
  }

  if (unmatchedGames.length > 0) {
    throw new Error(`Could not match ${unmatchedGames.length} Odds API game(s): ${unmatchedGames.join(", ")}`);
  }

  for (const update of updates) {
    await db.execute({
      sql: "update match set odds_api_match_id = ? where id = ?",
      args: [update.oddsApiMatchId, update.matchId],
    });
  }

  console.log(`Updated ${updates.length} match row(s) with Odds API match ids.`);
} finally {
  db.close();
}
