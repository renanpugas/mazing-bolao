import type { RouterClient } from "@orpc/server";
import { poolQuestionsRouter } from "./pool-questions";
import { poolScoringRouter } from "./pool-scoring";
import { poolsRouter } from "./pools";
import { predictionsRouter } from "./predictions";
import { sessionRouter } from "./session";
import { systemRouter } from "./system";
import { tournamentsRouter } from "./tournaments";
import { worldCupRouter } from "./world-cup";

export const appRouter = {
  ...systemRouter,
  session: sessionRouter,
  pools: poolsRouter,
  poolQuestions: poolQuestionsRouter,
  poolScoring: poolScoringRouter,
  predictions: predictionsRouter,
  tournaments: tournamentsRouter,
  worldCup: worldCupRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
