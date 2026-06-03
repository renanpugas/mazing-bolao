import { protectedProcedure } from "../index";
import { syncWorldCup2026Tournament } from "../services/worldcup2026";

export const worldCupRouter = {
  sync: protectedProcedure.handler(async () => syncWorldCup2026Tournament()),
};
