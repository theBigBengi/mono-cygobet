// src/auth/user-onboarding.ts
import { prisma } from "@repo/db";
import type { UserAuthUser } from "../types/auth";

type DbClient = Pick<typeof prisma, "userProfiles" | "users">;

/**
 * Ensure a user profile exists for the given user
 * Creates profile if it doesn't exist (idempotent)
 */
export async function ensureUserProfile(
  client: DbClient,
  userId: number
): Promise<void> {
  const existing = await client.userProfiles.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!existing) {
    await client.userProfiles.create({
      data: {
        userId,
        onboardingDone: false,
      },
      select: { id: true },
    });
  }
}

/**
 * Check if onboarding is required for a user
 * Authoritative server-side logic - this is the single source of truth
 *
 * A user requires onboarding if:
 * - onboarding_done is false, OR
 * - username is missing/invalid (null or empty)
 */
export async function isOnboardingRequired(
  client: DbClient,
  userId: number
): Promise<boolean> {
  const user = await client.users.findUnique({
    where: { id: userId },
    select: {
      username: true,
      userProfiles: {
        select: {
          onboardingDone: true,
        },
        take: 1,
      },
    },
  });

  if (!user) {
    // User doesn't exist - treat as onboarding required (shouldn't happen in practice)
    return true;
  }

  // Check if profile exists and onboarding is done
  const profile = user.userProfiles[0];
  if (!profile || !profile.onboardingDone) {
    return true;
  }

  // Check if username is missing or invalid
  if (!user.username || user.username.trim().length === 0) {
    return true;
  }

  return false;
}

/**
 * Complete onboarding for a user
 * Sets onboarding_done=true and onboarding_done_at=now
 * Must be called within a transaction
 */
export async function completeOnboarding(
  client: DbClient,
  userId: number,
  now: Date = new Date()
): Promise<void> {
  // Ensure profile exists before marking onboarding as complete
  await ensureUserProfile(client, userId);

  await client.userProfiles.updateMany({
    where: { userId },
    data: {
      onboardingDone: true,
      onboardingDoneAt: now,
    },
  });
}
