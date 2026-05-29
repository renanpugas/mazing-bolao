import type { RouterClient } from "@orpc/server";
import { poolsRouter } from "./pools";
import { predictionsRouter } from "./predictions";
import { systemRouter } from "./system";

export const appRouter = {
  ...systemRouter,
  pools: poolsRouter,
  predictions: predictionsRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
