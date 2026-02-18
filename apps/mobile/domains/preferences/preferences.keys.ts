// domains/preferences/preferences.keys.ts
// Query keys for user preferences domain.

export const preferencesKeys = {
  all: ["preferences"] as const,
  leagueOrder: () => [...preferencesKeys.all, "league-order"] as const,
} as const;
