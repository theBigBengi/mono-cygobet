// Query key factory for the profile feature.
// - All profile-related queries/mutations must use these keys.
// - Keeps cache invalidation consistent and prevents stringly-typed keys.
export const profileKeys = {
  all: ["profile"] as const,
  me: () => [...profileKeys.all, "me"] as const,
} as const;
