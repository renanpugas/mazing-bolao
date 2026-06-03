import { db, pool, poolUser } from "@mazing-bolao/db";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";
import { syncWorldCup2026 } from "../services/worldcup2026";

export const worldCupRouter = {
  sync: protectedProcedure
    .input(
      z.object({
        poolId: z.string().trim().min(1, "Bolão é obrigatório"),
      }),
    )
    .handler(async ({ context, input }) => {
      const poolExists = await db.query.pool.findFirst({
        where: eq(pool.id, input.poolId),
        columns: { id: true },
      });

      if (!poolExists) {
        throw new ORPCError("NOT_FOUND", { message: "Bolão não encontrado" });
      }

      const participant = await db.query.poolUser.findFirst({
        where: and(eq(poolUser.poolId, input.poolId), eq(poolUser.userId, context.session.user.id)),
        columns: { id: true },
      });

      if (!participant) {
        throw new ORPCError("FORBIDDEN", { message: "Você não participa desse bolão" });
      }

      return syncWorldCup2026(input.poolId);
    }),
};
