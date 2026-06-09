import { protectedProcedure } from "../index";
import { requireAdmin } from "../permissions";
import { syncWorldCup2026Tournament } from "../services/worldcup2026";

export const worldCupRouter = {
  sync: protectedProcedure.handler(async ({ context }) => {
    await requireAdmin(context.session.user.id);

    return syncWorldCup2026Tournament();
  }),
};
