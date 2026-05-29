import { db, pool } from "@mazing-bolao/db";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";

export const poolsRouter = {
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().min(1, "Nome é obrigatório").max(120),
      }),
    )
    .handler(async ({ input }) => {
      const newPool = {
        id: crypto.randomUUID(),
        name: input.name,
      };

      await db.insert(pool).values(newPool);

      return newPool;
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        name: z.string().trim().min(1, "Nome é obrigatório").max(120),
      }),
    )
    .handler(async ({ input }) => {
      const result = await db
        .update(pool)
        .set({ name: input.name, updatedAt: new Date() })
        .where(eq(pool.id, input.id))
        .returning({ id: pool.id, name: pool.name });

      const updatedPool = result[0];
      if (!updatedPool) {
        throw new ORPCError("NOT_FOUND", {
          message: "Bolão não encontrado",
        });
      }

      return updatedPool;
    }),
};
