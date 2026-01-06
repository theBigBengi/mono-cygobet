// src/auth/admin-session.ts
import crypto from "node:crypto";
import { prisma } from "@repo/db";
import {
  ADMIN_SESSION_TOKEN_BYTES,
  ADMIN_SESSION_TTL_MS,
} from "../constants/admin-auth.constants";
import type { AdminAuthUser } from "./admin-auth.types";
import { sha256Hex, generateRandomToken } from "../utils/crypto";

type DbClient = Pick<typeof prisma, "sessions" | "users">;

export function generateAdminSessionToken(): string {
  return generateRandomToken(ADMIN_SESSION_TOKEN_BYTES);
}

/**
 * We store only the hash in the DB (`sessions.sessionToken`) to reduce impact of DB leaks.
 * The raw token is only ever stored client-side (httpOnly cookie).
 */
export function hashAdminSessionToken(rawToken: string): string {
  return sha256Hex(rawToken);
}

export function computeAdminSessionExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + ADMIN_SESSION_TTL_MS);
}

export async function createAdminSession(
  client: DbClient,
  userId: number,
  now: Date = new Date()
): Promise<{ rawToken: string; expires: Date; sessionId: number }> {
  const rawToken = generateAdminSessionToken();
  const tokenHash = hashAdminSessionToken(rawToken);
  const expires = computeAdminSessionExpiry(now);

  const row = await client.sessions.create({
    data: { userId, sessionToken: tokenHash, expires },
    select: { id: true },
  });

  return { rawToken, expires, sessionId: row.id };
}

export async function deleteAdminSessionByRawToken(
  client: Pick<typeof prisma, "sessions">,
  rawToken: string | undefined
): Promise<void> {
  if (!rawToken) return;
  const tokenHash = hashAdminSessionToken(rawToken);
  await client.sessions.deleteMany({ where: { sessionToken: tokenHash } });
}

export async function resolveAdminSessionByRawToken(
  client: Pick<typeof prisma, "sessions">,
  rawToken: string | undefined,
  now: Date = new Date()
): Promise<null | {
  session: { id: number; userId: number; expires: Date };
  user: AdminAuthUser;
}> {
  if (!rawToken) return null;
  const tokenHash = hashAdminSessionToken(rawToken);

  const row = await client.sessions.findUnique({
    where: { sessionToken: tokenHash },
    select: {
      id: true,
      userId: true,
      expires: true,
      sessionToken: true,
      users: { select: { id: true, email: true, name: true, role: true } },
    },
  });

  if (!row) return null;

  // If expired: best-effort cleanup, then treat as missing.
  if (row.expires.getTime() <= now.getTime()) {
    await client.sessions.deleteMany({ where: { sessionToken: tokenHash } });
    return null;
  }

  return {
    session: { id: row.id, userId: row.userId, expires: row.expires },
    user: row.users as unknown as AdminAuthUser,
  };
}

// Convenience default exports for app usage (singleton prisma)
export const adminSessionDb = {
  create: (userId: number, now?: Date) =>
    createAdminSession(prisma, userId, now),
  resolve: (rawToken: string | undefined, now?: Date) =>
    resolveAdminSessionByRawToken(prisma, rawToken, now),
  deleteByRawToken: (rawToken: string | undefined) =>
    deleteAdminSessionByRawToken(prisma, rawToken),
};
