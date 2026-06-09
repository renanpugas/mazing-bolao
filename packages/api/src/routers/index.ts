import type { RouterClient } from "@orpc/server";
import { matchOddsRouter } from "./match-odds";
import { poolQuestionsRouter } from "./pool-questions";
import { poolScoringRouter } from "./pool-scoring";
import { poolsRouter } from "./pools";
import { predictionsRouter } from "./predictions";
import { sessionRouter } from "./session";
import { systemRouter } from "./system";
import { tournamentsRouter } from "./tournaments";
import { usersRouter } from "./users";
import { worldCupRouter } from "./world-cup";

export const appRouter = {
  ...systemRouter,
  session: sessionRouter,
  pools: poolsRouter,
  matchOdds: matchOddsRouter,
  poolQuestions: poolQuestionsRouter,
  poolScoring: poolScoringRouter,
  predictions: predictionsRouter,
  tournaments: tournamentsRouter,
  users: usersRouter,
  worldCup: worldCupRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
