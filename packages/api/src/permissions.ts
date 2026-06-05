import { db, pool, poolUser, user } from "@mazing-bolao/db";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";

export async function requireAdmin(userId: string) {
  const currentUser = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { id: true, isAdmin: true },
  });

  if (!currentUser?.isAdmin) {
    throw new ORPCError("FORBIDDEN", {
      message: "Somente administradores podem executar essa ação",
    });
  }

  return currentUser;
}

export async function requirePoolManager(poolId: string, userId: string) {
  const currentPool = await db.query.pool.findFirst({
    where: eq(pool.id, poolId),
    columns: { id: true, createdByUserId: true, tournamentId: true },
  });

  if (!currentPool) {
    throw new ORPCError("NOT_FOUND", {
      message: "Bolão não encontrado",
    });
  }

  const currentUser = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { id: true, isAdmin: true },
  });

  if (!currentUser?.isAdmin) {
    throw new ORPCError("FORBIDDEN", {
      message: "Somente administradores podem executar essa ação",
    });
  }

  return {
    ...currentPool,
    isAdmin: true,
    canManage: true,
  };
}

export async function requirePoolParticipantOrAdmin(poolId: string, userId: string) {
  const currentPool = await db.query.pool.findFirst({
    where: eq(pool.id, poolId),
    columns: { id: true, createdByUserId: true, tournamentId: true },
  });

  if (!currentPool) {
    throw new ORPCError("NOT_FOUND", {
      message: "Bolão não encontrado",
    });
  }

  const currentUser = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { id: true, isAdmin: true },
  });

  if (currentUser?.isAdmin) {
    return {
      ...currentPool,
      isAdmin: true,
      canManage: true,
      participant: null,
    };
  }

  const participant = await db.query.poolUser.findFirst({
    where: and(eq(poolUser.poolId, poolId), eq(poolUser.userId, userId)),
    columns: { id: true },
  });

  if (!participant) {
    throw new ORPCError("FORBIDDEN", {
      message: "Você não participa desse bolão",
    });
  }

  return {
    ...currentPool,
    isAdmin: false,
    canManage: false,
    participant,
  };
}
