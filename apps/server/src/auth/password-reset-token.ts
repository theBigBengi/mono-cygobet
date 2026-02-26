// src/auth/password-reset-token.ts
import { prisma } from "@repo/db";
import { generateRandomToken, sha256Hex } from "../utils/crypto";

const PASSWORD_RESET_TOKEN_BYTES = 32;
const PASSWORD_RESET_TOKEN_TTL_MS = 1000 * 60 * 15; // 15 minutes

type DbClient = Pick<typeof prisma, "passwordResetTokens">;

/**
 * Create a password reset token for a user.
 * Stores the hash in DB and returns the raw token (sent via email).
 */
export async function createPasswordResetToken(
  client: DbClient,
  userId: number,
  now: Date = new Date()
): Promise<{ rawToken: string; expiresAt: Date }> {
  const rawToken = generateRandomToken(PASSWORD_RESET_TOKEN_BYTES);
  const tokenHash = sha256Hex(rawToken);
  const expiresAt = new Date(now.getTime() + PASSWORD_RESET_TOKEN_TTL_MS);

  await client.passwordResetTokens.create({
    data: { userId, tokenHash, expiresAt },
    select: { id: true },
  });

  return { rawToken, expiresAt };
}

/**
 * Resolve a raw password reset token.
 * Returns token record if valid (not expired, not used), null otherwise.
 */
export async function resolvePasswordResetToken(
  client: DbClient,
  rawToken: string,
  now: Date = new Date()
): Promise<{ id: number; userId: number } | null> {
  const tokenHash = sha256Hex(rawToken);

  const row = await client.passwordResetTokens.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });

  if (!row) return null;
  if (row.usedAt) return null;
  if (row.expiresAt.getTime() <= now.getTime()) return null;

  return { id: row.id, userId: row.userId };
}

/**
 * Mark a specific password reset token as used.
 */
export async function markPasswordResetTokenUsed(
  client: DbClient,
  tokenId: number,
  now: Date = new Date()
): Promise<void> {
  await client.passwordResetTokens.update({
    where: { id: tokenId },
    data: { usedAt: now },
    select: { id: true },
  });
}

/**
 * Invalidate all pending (unused) password reset tokens for a user.
 */
export async function invalidateAllPasswordResetTokens(
  client: DbClient,
  userId: number,
  now: Date = new Date()
): Promise<void> {
  await client.passwordResetTokens.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: now },
  });
}
