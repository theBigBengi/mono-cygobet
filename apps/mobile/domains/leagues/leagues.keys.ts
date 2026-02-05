// domains/leagues/leagues.keys.ts
// Query keys for leagues domain.
// - All leagues-related queries must use these keys.

export const leaguesKeys = {
  all: ["leagues"] as const,
  lists: () => [...leaguesKeys.all, "list"] as const,
  list: (params: {
    page?: number;
    perPage?: number;
    includeSeasons?: boolean;
    onlyActiveSeasons?: boolean;
    includeCountry?: boolean;
    preset?: "popular";
    search?: string;
  }) => [...leaguesKeys.lists(), params] as const,
} as const;
