// users/repository.ts
// Repository layer for users - user-related database queries.

import { prisma } from "@repo/db";
import { GROUP_STATUS } from "../groups/constants";

/**
 * Find user by ID (for username lookup).
 */
export async function findUserById(id: number) {
  return await prisma.users.findUnique({
    where: { id },
    select: { username: true },
  });
}

/**
 * Get user username by ID.
 */
export async function getUserUsername(userId: number): Promise<string | null> {
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { username: true },
  });
  return user?.username ?? null;
}

/**
 * Count draft groups for a creator.
 */
export async function countDraftGroupsByCreator(creatorId: number) {
  return await prisma.groups.count({
    where: { creatorId, status: GROUP_STATUS.DRAFT },
  });
}
