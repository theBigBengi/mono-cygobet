// src/auth/user-refresh-session.ts
import { prisma } from "@repo/db";
import {
  generateRefreshToken,
  hashRefreshToken,
  computeRefreshTokenExpiry,
} from "./user-tokens";
import type { UserAuthUser } from "./user-auth.types";

type DbClient = Pick<typeof prisma, "refreshSessions" | "users">;

/**
 * Create a new refresh session for a user
 */
export async function createUserRefreshSession(
  client: DbClient,
  userId: number,
  now: Date = new Date()
): Promise<{ rawToken: string; expiresAt: Date; sessionId: number }> {
  const rawToken = generateRefreshToken();
  const tokenHash = hashRefreshToken(rawToken);
  const expiresAt = computeRefreshTokenExpiry(now);

  const row = await client.refreshSessions.create({
    data: { userId, tokenHash, expiresAt },
    select: { id: true },
  });

  return { rawToken, expiresAt, sessionId: row.id };
}

/**
 * Resolve refresh session by raw token
 * Returns null if not found, expired, or revoked
 */
export async function resolveUserRefreshSessionByRawToken(
  client: DbClient,
  rawToken: string | undefined,
  now: Date = new Date()
): Promise<null | {
  session: { id: number; userId: number; expiresAt: Date };
  user: UserAuthUser;
}> {
  if (!rawToken) return null;
  const tokenHash = hashRefreshToken(rawToken);

  const row = await client.refreshSessions.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      revokedAt: true,
      user: {
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          image: true,
          role: true,
        },
      },
    },
  });

  if (!row) return null;

  // Check if revoked
  if (row.revokedAt) return null;

  // Check if expired
  if (row.expiresAt.getTime() <= now.getTime()) {
    // Best-effort cleanup
    await client.refreshSessions.deleteMany({ where: { tokenHash } });
    return null;
  }

  return {
    session: {
      id: row.id,
      userId: row.userId,
      expiresAt: row.expiresAt,
    },
    user: {
      id: row.user.id,
      email: row.user.email,
      username: row.user.username,
      name: row.user.name,
      image: row.user.image,
      role: row.user.role,
    },
  };
}

/**
 * Revoke refresh session by raw token (set revokedAt)
 */
export async function revokeUserRefreshSessionByRawToken(
  client: Pick<typeof prisma, "refreshSessions">,
  rawToken: string | undefined
): Promise<void> {
  if (!rawToken) return;
  const tokenHash = hashRefreshToken(rawToken);
  const now = new Date();

  await client.refreshSessions.updateMany({
    where: {
      tokenHash,
      revokedAt: null, // Only revoke if not already revoked
    },
    data: { revokedAt: now },
  });
}

/**
 * Rotate refresh token: revoke old session and create new one
 * This is the non-transaction version (uses global prisma via convenience wrapper)
 */
export async function rotateUserRefreshSession(
  client: DbClient,
  oldRawToken: string,
  userId: number,
  now: Date = new Date()
): Promise<{ rawToken: string; expiresAt: Date; sessionId: number }> {
  // Revoke old session
  await revokeUserRefreshSessionByRawToken(client, oldRawToken);

  // Create new session
  return createUserRefreshSession(client, userId, now);
}

/**
 * Rotate refresh token within a transaction: revoke old session and create new one atomically
 * This version is safe for use inside prisma.$transaction()
 */
export async function rotateUserRefreshSessionTx(
  client: DbClient,
  oldRawToken: string,
  userId: number,
  now: Date = new Date()
): Promise<{ rawToken: string; expiresAt: Date; sessionId: number }> {
  if (!oldRawToken) {
    throw new Error("oldRawToken is required for rotation");
  }

  const tokenHash = hashRefreshToken(oldRawToken);
  const nowDate = now;

  // Revoke old session (updateMany set revokedAt where tokenHash and revokedAt null)
  await client.refreshSessions.updateMany({
    where: {
      tokenHash,
      revokedAt: null, // Only revoke if not already revoked
    },
    data: { revokedAt: nowDate },
  });

  // Create new session with new raw token + tokenHash + expiresAt
  return createUserRefreshSession(client, userId, nowDate);
}

// Convenience default exports for app usage (singleton prisma)
export const userRefreshSessionDb = {
  create: (userId: number, now?: Date) =>
    createUserRefreshSession(prisma, userId, now),
  resolve: (rawToken: string | undefined, now?: Date) =>
    resolveUserRefreshSessionByRawToken(prisma, rawToken, now),
  revoke: (rawToken: string | undefined) =>
    revokeUserRefreshSessionByRawToken(prisma, rawToken),
  rotate: (oldRawToken: string, userId: number, now?: Date) =>
    rotateUserRefreshSession(prisma, oldRawToken, userId, now),
};
