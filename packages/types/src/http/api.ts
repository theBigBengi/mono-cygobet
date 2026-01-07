export type ApiErrorResponse = {
  status: "error";
  message: string;
};

export type ApiUpcomingFixturesInclude =
  | "odds"
  | "teams"
  | "league"
  | "country";

export type ApiUpcomingFixturesQuery = {
  /**
   * ISO datetime string OR unix seconds/millis (number or numeric string)
   */
  from?: string | number;
  /**
   * ISO datetime string OR unix seconds/millis (number or numeric string)
   */
  to?: string | number;
  /**
   * League IDs filter.
   * Accepts comma-separated string ("1,2,3") or array.
   */
  leagues?: string | number | Array<string | number>;
  /**
   * Odds marketExternalIds filter (applies only when include contains "odds").
   * Accepts comma-separated string ("1,2,3") or array.
   */
  markets?: string | number | Array<string | number>;
  /**
   * If true, returns only fixtures that have odds.
   * Default: false (no filter).
   */
  hasOdds?: boolean;
  /**
   * Comma-separated string or array of expansions.
   * Supported: odds, teams, league, country
   */
  include?: string | string[];
  page?: number;
  perPage?: number;
};

export type ApiUpcomingFixturesResponse = {
  status: "success";
  data: Array<{
    id: number;
    name: string;
    kickoffAt: string;
    startTs: number;
    state: string;
    stage: string | null;
    round: string | null;
    league?: {
      id: number;
      name: string;
      imagePath: string | null;
    };
    country?: {
      id: number;
      name: string;
      imagePath: string | null;
    } | null;
    homeTeam?: { id: number; name: string; imagePath: string | null };
    awayTeam?: { id: number; name: string; imagePath: string | null };
    odds?: Array<{
      id: number;
      value: string;
      label: string;
      marketName: string;
      probability: string | null;
      winning: boolean;
      name: string | null;
      handicap: string | null;
      total: string | null;
      sortOrder: number;
    }>;
  }>;
  pagination: {
    page: number;
    perPage: number;
    totalItems: number | null;
    totalPages: number | null;
  };
};

export interface ApiUserProfileResponse {
  user: {
    id: number;
    email: string;
    username: string | null;
    name: string | null;
    image: string | null;
    role: string;
  };
  profile: {
    level: number;
    dailyStreak: number;
    lastClaimAt: string | null;
    favouriteTeamId: number | null;
    favouriteLeagueId: number | null;
    onboardingDone: boolean;
  };
}
