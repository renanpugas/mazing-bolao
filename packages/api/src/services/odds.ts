import { env } from "@mazing-bolao/env/server";
import { ORPCError } from "@orpc/server";

export const ODDS_API_SPORT = "soccer_fifa_world_cup";
export const ODDS_API_HOST = "https://api.the-odds-api.com";
export const ODDS_API_BOOKMAKER = "fanduel";
export const ODDS_API_MARKET = "h2h";

type OddsOutcome = {
  name?: string;
  price?: number;
};

type OddsMarket = {
  key?: string;
  outcomes?: OddsOutcome[];
};

type OddsBookmaker = {
  key?: string;
  markets?: OddsMarket[];
};

type OddsEvent = {
  id?: string;
  home_team?: string;
  away_team?: string;
  commence_time?: string;
  bookmakers?: OddsBookmaker[];
};

export type MatchOdds = {
  homeTeam: string;
  awayTeam: string;
  oddsHomeTeam: number;
  oddsAwayTeam: number;
  oddsDraw: number;
};

export type OddsApiEvent = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
};

const teamNameAliases = new Map([
  ["usa", "united states"],
  ["dr congo", "democratic republic of the congo"],
  ["democratic republic congo", "democratic republic of the congo"],
  ["bosnia herzegovina", "bosnia and herzegovina"],
]);

function assertOddsApiKey() {
  if (!env.ODDS_API_KEY) {
    throw new ORPCError("BAD_REQUEST", {
      message: "ODDS_API_KEY não configurada",
    });
  }

  return env.ODDS_API_KEY;
}

export function normalizeOddsApiTeamName(teamName: string) {
  const normalized = teamName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  return teamNameAliases.get(normalized) ?? normalized;
}

function findOutcome(outcomes: OddsOutcome[], name: string, errorMessage: string) {
  const outcome = outcomes.find((item) => item.name === name);

  if (typeof outcome?.price !== "number") {
    throw new ORPCError("BAD_GATEWAY", {
      message: errorMessage,
    });
  }

  return outcome.price;
}

export function extractH2HOdds(event: OddsEvent): MatchOdds {
  if (!event.home_team || !event.away_team) {
    throw new ORPCError("BAD_GATEWAY", {
      message: "Resposta da The Odds API não trouxe mandante e visitante",
    });
  }

  const bookmaker = event.bookmakers?.find((item) => item.key === ODDS_API_BOOKMAKER);
  if (!bookmaker) {
    throw new ORPCError("BAD_GATEWAY", {
      message: "Bookmaker fanduel não encontrado na resposta da The Odds API",
    });
  }

  const market = bookmaker.markets?.find((item) => item.key === ODDS_API_MARKET);
  if (!market?.outcomes?.length) {
    throw new ORPCError("BAD_GATEWAY", {
      message: "Mercado h2h não encontrado na resposta da The Odds API",
    });
  }

  return {
    homeTeam: event.home_team,
    awayTeam: event.away_team,
    oddsHomeTeam: findOutcome(market.outcomes, event.home_team, "Odd do mandante não encontrada na resposta da The Odds API"),
    oddsAwayTeam: findOutcome(market.outcomes, event.away_team, "Odd do visitante não encontrada na resposta da The Odds API"),
    oddsDraw: findOutcome(market.outcomes, "Draw", "Odd de empate não encontrada na resposta da The Odds API"),
  };
}

export async function fetchMatchOdds(oddsApiMatchId: string): Promise<MatchOdds> {
  const apiKey = assertOddsApiKey();
  const url = new URL(`/v4/sports/${ODDS_API_SPORT}/events/${oddsApiMatchId}/odds`, ODDS_API_HOST);
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("regions", "us");
  url.searchParams.set("oddsFormat", "decimal");
  url.searchParams.set("bookmakers", ODDS_API_BOOKMAKER);
  url.searchParams.set("markets", ODDS_API_MARKET);

  const response = await fetch(url);

  if (!response.ok) {
    throw new ORPCError("BAD_GATEWAY", {
      message: `The Odds API retornou status ${response.status}`,
    });
  }

  const payload = (await response.json()) as OddsEvent | OddsEvent[];
  const event = Array.isArray(payload) ? payload.find((item) => item.id === oddsApiMatchId) : payload;

  if (!event) {
    throw new ORPCError("BAD_GATEWAY", {
      message: "Partida não encontrada na resposta da The Odds API",
    });
  }

  return extractH2HOdds(event);
}

export async function fetchOddsApiEvents(): Promise<OddsApiEvent[]> {
  const apiKey = assertOddsApiKey();
  const url = new URL(`/v4/sports/${ODDS_API_SPORT}/events`, ODDS_API_HOST);
  url.searchParams.set("apiKey", apiKey);

  const response = await fetch(url);

  if (!response.ok) {
    throw new ORPCError("BAD_GATEWAY", {
      message: `The Odds API retornou status ${response.status}`,
    });
  }

  const payload = (await response.json()) as OddsEvent[];

  if (!Array.isArray(payload)) {
    throw new ORPCError("BAD_GATEWAY", {
      message: "Resposta da The Odds API não trouxe uma lista de eventos",
    });
  }

  return payload
    .filter((event): event is Required<Pick<OddsEvent, "id" | "home_team" | "away_team" | "commence_time">> =>
      Boolean(event.id && event.home_team && event.away_team && event.commence_time),
    )
    .map((event) => ({
      id: event.id,
      homeTeam: event.home_team,
      awayTeam: event.away_team,
      commenceTime: event.commence_time,
    }));
}
