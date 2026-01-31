// Query key factory for the profile feature.
// - All profile-related queries/mutations must use these keys.
// - Keeps cache invalidation consistent and prevents stringly-typed keys.
export const profileKeys = {
  all: ["profile"] as const,
  me: () => [...profileKeys.all, "me"] as const,
  stats: (userId: number) =>
    [...profileKeys.all, "stats", userId] as const,
  headToHead: (userId: number, opponentId: number) =>
    [...profileKeys.all, "h2h", userId, opponentId] as const,
  h2hOpponents: (userId: number) =>
    [...profileKeys.all, "h2h-opponents", userId] as const,
} as const;
