import type { RouterClient } from "@orpc/server";
import { poolsRouter } from "./pools";
import { predictionsRouter } from "./predictions";
import { sessionRouter } from "./session";
import { systemRouter } from "./system";
import { worldCupRouter } from "./world-cup";

export const appRouter = {
  ...systemRouter,
  session: sessionRouter,
  pools: poolsRouter,
  predictions: predictionsRouter,
  worldCup: worldCupRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
