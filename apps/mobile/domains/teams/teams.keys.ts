// domains/teams/teams.keys.ts
// Query keys for teams domain.
// - All teams-related queries must use these keys.

export const teamsKeys = {
  all: ["teams"] as const,
  lists: () => [...teamsKeys.all, "list"] as const,
  list: (params: {
    page?: number;
    perPage?: number;
    leagueId?: number;
    includeCountry?: boolean;
    search?: string;
  }) => [...teamsKeys.lists(), params] as const,
} as const;
