// lib/cache-invalidation.ts
// Centralized cache invalidation helpers.
// All functions are no-ops when Redis is not configured.

import { getCache } from "./cache";

/** Delete ranking cache entries for the given group IDs. */
export async function invalidateRankingCache(
  groupIds: number[]
): Promise<void> {
  const cache = getCache("ranking");
  if (!cache) return;
  await Promise.all(groupIds.map((id) => cache.del(String(id))));
}

/** Delete user-stats cache entries for the given user IDs. */
export async function invalidateUserStatsCache(
  userIds: number[]
): Promise<void> {
  const cache = getCache("user-stats");
  if (!cache) return;
  await Promise.all(userIds.map((id) => cache.del(String(id))));
}

/** Pattern-delete all H2H cache entries involving any of the given user IDs. */
export async function invalidateH2HCache(userIds: number[]): Promise<void> {
  const cache = getCache("h2h");
  if (!cache) return;
  // H2H keys are canonical: "min:max". Any user could be on either side,
  // so a wildcard scan is the simplest correct approach.
  await cache.invalidatePattern("*");
}
