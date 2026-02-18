// users/preferences.service.ts
// Service layer for user preferences (league order, etc.).

import { prisma, Prisma } from "@repo/db";
import { getLeagueOrderSettings } from "../../admin/settings.service";

export interface UserLeaguePreferences {
  leagueOrder: number[] | null;
}

interface UserPreferencesJson {
  leagueOrder?: number[];
}

/**
 * Get user's league order preferences.
 * Returns the user's custom league order if set, otherwise null.
 */
export async function getUserLeaguePreferences(
  userId: number
): Promise<UserLeaguePreferences> {
  const profile = await prisma.userProfiles.findUnique({
    where: { userId },
    select: { preferences: true },
  });

  if (!profile || !profile.preferences) {
    return { leagueOrder: null };
  }

  const prefs = profile.preferences as UserPreferencesJson;
  return {
    leagueOrder: prefs.leagueOrder ?? null,
  };
}

/**
 * Update user's league order preferences.
 * @param userId - User ID
 * @param leagueOrder - Array of league IDs in preferred order
 */
export async function updateUserLeaguePreferences(
  userId: number,
  leagueOrder: number[]
): Promise<UserLeaguePreferences> {
  // Validate that all provided league IDs exist
  if (leagueOrder.length > 0) {
    const existingLeagues = await prisma.leagues.findMany({
      where: { id: { in: leagueOrder } },
      select: { id: true },
    });
    const existingIds = new Set(existingLeagues.map((l) => l.id));
    const invalidIds = leagueOrder.filter((id) => !existingIds.has(id));
    if (invalidIds.length > 0) {
      throw new Error(`Invalid league IDs: ${invalidIds.join(", ")}`);
    }
  }

  // Get existing preferences to preserve other fields
  const profile = await prisma.userProfiles.findUnique({
    where: { userId },
    select: { preferences: true },
  });

  const existingPrefs = (profile?.preferences as UserPreferencesJson) ?? {};
  const newPrefs: UserPreferencesJson = {
    ...existingPrefs,
    leagueOrder: leagueOrder.length > 0 ? leagueOrder : undefined,
  };

  // Remove leagueOrder key if empty
  if (!newPrefs.leagueOrder || newPrefs.leagueOrder.length === 0) {
    delete newPrefs.leagueOrder;
  }

  await prisma.userProfiles.update({
    where: { userId },
    data: {
      preferences: Object.keys(newPrefs).length > 0 ? (newPrefs as Prisma.InputJsonValue) : Prisma.JsonNull,
    },
  });

  return {
    leagueOrder: newPrefs.leagueOrder ?? null,
  };
}

/**
 * Reset user's league order preferences to default (removes custom order).
 */
export async function resetUserLeaguePreferences(
  userId: number
): Promise<UserLeaguePreferences> {
  // Get existing preferences to preserve other fields
  const profile = await prisma.userProfiles.findUnique({
    where: { userId },
    select: { preferences: true },
  });

  const existingPrefs = (profile?.preferences as UserPreferencesJson) ?? {};
  const { leagueOrder: _, ...otherPrefs } = existingPrefs;

  await prisma.userProfiles.update({
    where: { userId },
    data: {
      preferences: Object.keys(otherPrefs).length > 0 ? (otherPrefs as Prisma.InputJsonValue) : Prisma.JsonNull,
    },
  });

  return { leagueOrder: null };
}

/**
 * Get effective league order for a user.
 * Priority: user preferences > admin default > null (sort by kickoff).
 */
export async function getEffectiveLeagueOrder(
  userId: number
): Promise<number[] | null> {
  // First check user's own preferences
  const userPrefs = await getUserLeaguePreferences(userId);
  if (userPrefs.leagueOrder && userPrefs.leagueOrder.length > 0) {
    return userPrefs.leagueOrder;
  }

  // Fall back to admin default
  const adminSettings = await getLeagueOrderSettings();
  if (adminSettings.defaultLeagueOrder && adminSettings.defaultLeagueOrder.length > 0) {
    return adminSettings.defaultLeagueOrder;
  }

  // No custom order - sort by kickoff time
  return null;
}
