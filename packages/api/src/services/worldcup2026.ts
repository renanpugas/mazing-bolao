import { db, groupStanding, match, stadium, team, tournament } from "@mazing-bolao/db";

const SOURCE = "worldcup2026";
const SEASON = "2026";
const TOURNAMENT_ID = `${SOURCE}:${SEASON}`;
const TOURNAMENT_SLUG = "copa-do-mundo-2026";

const API_BASE = "https://worldcup26.ir/get";
const RAW_BASE = "https://raw.githubusercontent.com/rezarahiminia/worldcup2026/main";

const defaultMatchTimeZone = "UTC";

export const fifaMenRankingReferenceDate = "2026-06-11";

export const fifaMenRankingByCode: Record<string, number> = {
  ARG: 1,
  ESP: 2,
  FRA: 3,
  ENG: 4,
  POR: 5,
  BRA: 6,
  MAR: 7,
  NED: 8,
  BEL: 9,
  GER: 10,
  CRO: 11,
  COL: 13,
  MEX: 14,
  SEN: 15,
  URU: 16,
  USA: 17,
  JPN: 18,
  SUI: 19,
  IRN: 20,
  AUT: 22,
  ECU: 24,
  TUR: 25,
  AUS: 26,
  SWE: 28,
  NOR: 29,
  CAN: 30,
  PAN: 31,
  EGY: 32,
  ALG: 36,
  CZE: 39,
  CIV: 41,
  PAR: 43,
  SCO: 45,
  TUN: 46,
  QAT: 53,
  RSA: 56,
  UZB: 57,
  KSA: 58,
  IRQ: 59,
  COD: 60,
  JOR: 64,
  CPV: 70,
  BIH: 74,
  GHA: 75,
  CUW: 82,
  HAI: 83,
  NZL: 86,
};

export const worldCup2026StadiumTimeZones = {
  "1": "America/Mexico_City",
  "2": "America/Mexico_City",
  "3": "America/Monterrey",
  "4": "America/Chicago",
  "5": "America/Chicago",
  "6": "America/Chicago",
  "7": "America/New_York",
  "8": "America/New_York",
  "9": "America/New_York",
  "10": "America/New_York",
  "11": "America/New_York",
  "12": "America/Toronto",
  "13": "America/Vancouver",
  "14": "America/Los_Angeles",
  "15": "America/Los_Angeles",
  "16": "America/Los_Angeles",
} as const;

type AnyRecord = Record<string, any>;

const endpoints = {
  games: [`${API_BASE}/games`, `${RAW_BASE}/football.matches.json`],
  teams: [`${API_BASE}/teams`, `${RAW_BASE}/football.teams.json`],
  groups: [`${API_BASE}/groups`, `${RAW_BASE}/football.matchtables.json`],
  stadiums: [`${API_BASE}/stadiums`, `${RAW_BASE}/football.stadiums.json`],
};

async function fetchJsonWithFallback(urls: string[]) {
  let lastError: unknown;

  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`${url} returned ${response.status}`);
      }

      const payload = (await response.json()) as AnyRecord | AnyRecord[];
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload.data)) return payload.data;

      for (const value of Object.values(payload)) {
        if (Array.isArray(value)) return value;
      }

      throw new Error(`${url} did not return an array payload`);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Failed to fetch World Cup 2026 data");
}

export const fetchGames = () => fetchJsonWithFallback(endpoints.games) as Promise<AnyRecord[]>;
export const fetchTeams = () => fetchJsonWithFallback(endpoints.teams) as Promise<AnyRecord[]>;
export const fetchGroups = () => fetchJsonWithFallback(endpoints.groups) as Promise<AnyRecord[]>;
export const fetchStadiums = () => fetchJsonWithFallback(endpoints.stadiums) as Promise<AnyRecord[]>;

export function getWorldCup2026Tournament(syncedAt = new Date()) {
  return {
    id: TOURNAMENT_ID,
    name: "Copa do Mundo 2026",
    slug: TOURNAMENT_SLUG,
    externalSource: SOURCE,
    season: SEASON,
    startsAt: parseWorldCupDate("06/11/2026 13:00", "America/Mexico_City"),
    endsAt: parseWorldCupDate("07/19/2026 15:00", "America/New_York"),
    rawPayload: { source: API_BASE, season: SEASON },
    lastSyncedAt: syncedAt,
    updatedAt: syncedAt,
  };
}

export function toNullableString(value: unknown) {
  if (value === null || value === undefined || value === "" || value === "null") return null;
  return String(value);
}

export function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "" || value === "null") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toUpperCase() === "TRUE";
  return Boolean(value);
}

function getDateTimeFormatParts(date: Date, timeZone: string): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  } as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

export function getWorldCup2026StadiumTimeZone(stadiumId: unknown) {
  const id = toNullableString(stadiumId);
  return id ? worldCup2026StadiumTimeZones[id as keyof typeof worldCup2026StadiumTimeZones] ?? defaultMatchTimeZone : defaultMatchTimeZone;
}

export function parseWorldCupDate(value: unknown, timeZone = defaultMatchTimeZone) {
  const text = toNullableString(value);
  if (!text) return new Date(Number.NaN);

  const match = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/.exec(text);
  if (!match) return new Date(text);

  const [, month, day, year, hour, minute] = match;
  const utcGuess = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  const localGuess = getDateTimeFormatParts(new Date(utcGuess), timeZone);
  const localGuessAsUtc = Date.UTC(localGuess.year, localGuess.month - 1, localGuess.day, localGuess.hour, localGuess.minute, localGuess.second ?? 0);

  return new Date(utcGuess - (localGuessAsUtc - utcGuess));
}

export function getFlagEmoji(iso2: unknown) {
  const code = toNullableString(iso2)?.toUpperCase();
  if (!code) return null;
  if (code === "ENG" || code === "SCO") return "🏴";
  if (!/^[A-Z]{2}$/.test(code)) return null;

  return String.fromCodePoint(...[...code].map((char) => 0x1f1e6 + char.charCodeAt(0) - 65));
}

export function normalizeTeam(payload: AnyRecord, syncedAt = new Date()) {
  const iso2 = toNullableString(payload.iso2);
  const fifaCode = toNullableString(payload.fifa_code);
  return {
    id: `${SOURCE}:team:${payload.id}`,
    externalSource: SOURCE,
    externalId: String(payload.id),
    name: toNullableString(payload.name_en ?? payload.name) ?? String(payload.id),
    fifaCode,
    fifaRankingPosition: fifaCode ? fifaMenRankingByCode[fifaCode] ?? null : null,
    iso2,
    groupName: toNullableString(payload.groups ?? payload.group),
    emoji: getFlagEmoji(iso2),
    rawPayload: { ...payload, fifa_ranking_reference_date: fifaMenRankingReferenceDate },
    lastSyncedAt: syncedAt,
    updatedAt: syncedAt,
  };
}

export function normalizeStadium(payload: AnyRecord, syncedAt = new Date()) {
  return {
    id: `${SOURCE}:stadium:${payload.id}`,
    externalSource: SOURCE,
    externalId: String(payload.id),
    name: toNullableString(payload.name_en ?? payload.name) ?? String(payload.id),
    fifaName: toNullableString(payload.fifa_name),
    city: toNullableString(payload.city_en ?? payload.city),
    country: toNullableString(payload.country_en ?? payload.country),
    capacity: toNullableNumber(payload.capacity),
    region: toNullableString(payload.region),
    rawPayload: payload,
    lastSyncedAt: syncedAt,
    updatedAt: syncedAt,
  };
}

export function normalizeGroup(payload: AnyRecord, syncedAt = new Date()) {
  const groupName = String(payload.group);
  return (payload.teams ?? []).map((standing: AnyRecord) => ({
    id: `${SOURCE}:standing:${SEASON}:${groupName}:${standing.team_id}`,
    externalSource: SOURCE,
    season: SEASON,
    groupName,
    teamExternalId: String(standing.team_id),
    played: toNullableNumber(standing.mp) ?? 0,
    wins: toNullableNumber(standing.w) ?? 0,
    draws: toNullableNumber(standing.d) ?? 0,
    losses: toNullableNumber(standing.l) ?? 0,
    points: toNullableNumber(standing.pts) ?? 0,
    goalsFor: toNullableNumber(standing.gf) ?? 0,
    goalsAgainst: toNullableNumber(standing.ga) ?? 0,
    goalsDiff: toNullableNumber(standing.gd) ?? 0,
    rawPayload: standing,
    lastSyncedAt: syncedAt,
    updatedAt: syncedAt,
  }));
}

export function normalizeGame(
  payload: AnyRecord,
  teamsById = new Map<string, ReturnType<typeof normalizeTeam>>(),
  stadiumsById = new Map<string, ReturnType<typeof normalizeStadium>>(),
  syncedAt = new Date(),
) {
  const homeTeamExternalId = toNullableString(payload.home_team_id);
  const awayTeamExternalId = toNullableString(payload.away_team_id);
  const homeTeam = homeTeamExternalId ? teamsById.get(homeTeamExternalId) : undefined;
  const awayTeam = awayTeamExternalId ? teamsById.get(awayTeamExternalId) : undefined;
  const stadiumData = toNullableString(payload.stadium_id)
    ? stadiumsById.get(String(payload.stadium_id))
    : undefined;
  const startsAtTimeZone = getWorldCup2026StadiumTimeZone(payload.stadium_id);
  const homeLabel = toNullableString(payload.home_team_label) ?? homeTeam?.name ?? "A definir";
  const awayLabel = toNullableString(payload.away_team_label) ?? awayTeam?.name ?? "A definir";

  return {
    externalSource: SOURCE,
    externalId: String(payload.id),
    season: SEASON,
    stage: toNullableString(payload.type),
    groupName: toNullableString(payload.group),
    matchday: toNullableNumber(payload.matchday),
    homeTeamExternalId: homeTeamExternalId === "0" ? null : homeTeamExternalId,
    awayTeamExternalId: awayTeamExternalId === "0" ? null : awayTeamExternalId,
    homeTeam: homeTeam?.name ?? homeLabel,
    awayTeam: awayTeam?.name ?? awayLabel,
    homeTeamLabel: homeLabel,
    awayTeamLabel: awayLabel,
    homeTeamEmoji: homeTeam?.emoji ?? null,
    awayTeamEmoji: awayTeam?.emoji ?? null,
    homeTeamFifaRankingPosition: homeTeam?.fifaRankingPosition ?? null,
    awayTeamFifaRankingPosition: awayTeam?.fifaRankingPosition ?? null,
    startsAt: parseWorldCupDate(payload.local_date, startsAtTimeZone),
    startsAtTimeZone,
    stadiumExternalId: toNullableString(payload.stadium_id),
    stadiumName: stadiumData?.name ?? null,
    stadiumCity: stadiumData?.city ?? null,
    homeScore: toNullableNumber(payload.home_score),
    awayScore: toNullableNumber(payload.away_score),
    finished: toBoolean(payload.finished),
    timeElapsed: toNullableString(payload.time_elapsed),
    rawPayload: payload,
    lastSyncedAt: syncedAt,
    updatedAt: syncedAt,
  };
}

export async function syncWorldCup2026Tournament() {
  const syncedAt = new Date();
  const [teamPayloads, stadiumPayloads, groupPayloads, gamePayloads] = await Promise.all([
    fetchTeams(),
    fetchStadiums(),
    fetchGroups(),
    fetchGames(),
  ]);

  const normalizedTeams = teamPayloads.map((payload) => normalizeTeam(payload, syncedAt));
  const normalizedStadiums = stadiumPayloads.map((payload) => normalizeStadium(payload, syncedAt));
  const normalizedStandings = groupPayloads.flatMap((payload) => normalizeGroup(payload, syncedAt));
  const teamsById = new Map(normalizedTeams.map((item) => [item.externalId, item]));
  const stadiumsById = new Map(normalizedStadiums.map((item) => [item.externalId, item]));
  const normalizedGames = gamePayloads.map((payload) => normalizeGame(payload, teamsById, stadiumsById, syncedAt));
  const tournamentData = getWorldCup2026Tournament(syncedAt);

  await db.insert(tournament).values(tournamentData).onConflictDoUpdate({
    target: [tournament.externalSource, tournament.season],
    set: tournamentData,
  });

  for (const item of normalizedTeams) {
    await db.insert(team).values(item).onConflictDoUpdate({
      target: [team.externalSource, team.externalId],
      set: item,
    });
  }

  for (const item of normalizedStadiums) {
    await db.insert(stadium).values(item).onConflictDoUpdate({
      target: [stadium.externalSource, stadium.externalId],
      set: item,
    });
  }

  for (const item of normalizedStandings) {
    await db.insert(groupStanding).values(item).onConflictDoUpdate({
      target: [
        groupStanding.externalSource,
        groupStanding.season,
        groupStanding.groupName,
        groupStanding.teamExternalId,
      ],
      set: item,
    });
  }

  for (const item of normalizedGames) {
    await db
      .insert(match)
      .values({
        id: crypto.randomUUID(),
        tournamentId: tournamentData.id,
        ...item,
      })
      .onConflictDoUpdate({
        target: [match.tournamentId, match.externalSource, match.externalId],
        set: item,
      });
  }

  return {
    tournament: tournamentData,
    teams: normalizedTeams.length,
    stadiums: normalizedStadiums.length,
    standings: normalizedStandings.length,
    matches: normalizedGames.length,
    syncedAt,
  };
}

export const syncWorldCup2026 = syncWorldCup2026Tournament;
