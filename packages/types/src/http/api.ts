export type ApiErrorResponse = {
  status: "error";
  message: string;
};

export type ApiUpcomingFixturesInclude =
  | "odds"
  | "teams"
  | "league"
  | "country";

/**
 * Query parameters for the PUBLIC upcoming fixtures endpoint.
 * Minimal contract: only supports pagination and optional days.
 */
export type ApiPublicUpcomingFixturesQuery = {
  page?: number;
  perPage?: number;
  days?: number;
};

/**
 * Query parameters for the PROTECTED upcoming fixtures endpoint.
 * Supports full filter set (from/to, leagues, markets, include, etc.).
 */
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
    prediction?: {
      home: number;
      away: number;
      updatedAt: string;
      placedAt: string;
      settled: boolean;
    } | null;
  }>;
  pagination: {
    page: number;
    perPage: number;
    totalItems: number | null;
    totalPages: number | null;
  };
};

// Generic alias for "fixtures list" responses used across endpoints.
export type ApiFixturesListResponse = ApiUpcomingFixturesResponse;

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

/**
 * Season item returned when including seasons in league response.
 */
export type ApiSeasonItem = {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  leagueId: number;
};

/**
 * Query parameters for the Get Leagues endpoint.
 */
export type ApiLeaguesQuery = {
  page?: number;
  perPage?: number;
  includeSeasons?: boolean;
  onlyActiveSeasons?: boolean;
};

/**
 * League item returned by the Get Leagues endpoint.
 */
export type ApiLeagueItem = {
  id: number;
  name: string;
  imagePath: string | null;
  countryId: number;
  type: string;
  shortCode: string | null;
  seasons?: ApiSeasonItem[];
};

/**
 * Response from the Get Leagues endpoint.
 */
export type ApiLeaguesResponse = {
  status: "success";
  data: ApiLeagueItem[];
  pagination: {
    page: number;
    perPage: number;
    totalItems: number | null;
    totalPages: number | null;
    pageCount: number;
    hasMore: boolean;
  };
  message: string;
};

/**
 * Country item returned when including country in team response.
 */
export type ApiCountryItem = {
  id: number;
  name: string;
  imagePath: string | null;
};

/**
 * Query parameters for the Get Teams endpoint.
 */
export type ApiTeamsQuery = {
  page?: number;
  perPage?: number;
  leagueId?: number;
  includeCountry?: boolean;
  search?: string;
};

/**
 * Team item returned by the Get Teams endpoint.
 */
export type ApiTeamItem = {
  id: number;
  name: string;
  imagePath: string | null;
  countryId: number | null;
  shortCode: string | null;
  country?: ApiCountryItem | null;
};

/**
 * Response from the Get Teams endpoint.
 */
export type ApiTeamsResponse = {
  status: "success";
  data: ApiTeamItem[];
  pagination: {
    page: number;
    perPage: number;
    totalItems: number | null;
    totalPages: number | null;
    pageCount: number;
    hasMore: boolean;
  };
  message: string;
};

/**
 * Group privacy setting.
 */
export type ApiGroupPrivacy = "private" | "public";

/**
 * Group status.
 */
export type ApiGroupStatus = "draft" | "active" | "ended";

/**
 * Body for creating a group.
 */
export type ApiCreateGroupBody = {
  name: string;
  privacy?: ApiGroupPrivacy;
  /** Used when selectionMode is "games". */
  fixtureIds?: number[];
  /** "games" | "teams" | "leagues". Default "games" if omitted. */
  selectionMode?: "games" | "teams" | "leagues";
  /** Used when selectionMode is "teams". */
  teamIds?: number[];
  /** Used when selectionMode is "leagues". Exactly one league. */
  leagueIds?: number[];
};

/**
 * Body for updating a group.
 */
export type ApiUpdateGroupBody = {
  name?: string;
  privacy?: ApiGroupPrivacy;
  fixtureIds?: number[];
};

/**
 * Body for publishing a group.
 */
export type ApiPublishGroupBody = {
  name?: string;
  privacy?: ApiGroupPrivacy;
};

/**
 * Response from publishing a group.
 */
export type ApiPublishGroupResponse = ApiGroupResponse;

/**
 * Group item returned by group endpoints.
 */
export type ApiGroupItem = {
  id: number;
  name: string;
  privacy: ApiGroupPrivacy;
  status: ApiGroupStatus;
  creatorId: number;
  createdAt: string;
  updatedAt: string;
  /**
   * Optional fixtures array when include=fixtures query parameter is used.
   * Contains fixtures with user predictions.
   */
  fixtures?: ApiFixturesListResponse["data"];
  /**
   * Number of participants (members with status "joined") in the group.
   * Only included for active/ended groups, not for draft groups.
   */
  memberCount?: number;
  /**
   * The next upcoming game for this group, if any.
   * Only included for active/ended groups, not for draft groups.
   */
  nextGame?: ApiFixturesListResponse["data"][0] | null;
  /**
   * The first game of the group (earliest fixture).
   * Only included for draft groups.
   */
  firstGame?: ApiFixturesListResponse["data"][0] | null;
  /**
   * Prediction statistics for the current user.
   * Only included for active/ended groups.
   */
  predictionsCount?: number;
  /**
   * Total number of fixtures in the group.
   * Only included for active/ended groups.
   */
  totalFixtures?: number;
  /**
   * Whether there are upcoming games that need predictions.
   * Only included for active/ended groups.
   */
  hasUnpredictedGames?: boolean;
};

/**
 * Response from the Create Group endpoint.
 */
export type ApiGroupResponse = {
  status: "success";
  data: ApiGroupItem;
  message: string;
};

/**
 * Response from the List My Groups endpoint.
 */
export type ApiGroupsResponse = {
  status: "success";
  data: ApiGroupItem[];
  message: string;
};

/**
 * Response for fetching fixtures attached to a specific group.
 * Reuses the same fixture item shape as generic fixtures list responses.
 */
export type ApiGroupFixturesResponse = {
  status: "success";
  data: ApiFixturesListResponse["data"];
  message: string;
};

/**
 * Body for batch saving group predictions.
 */
export type ApiSaveGroupPredictionsBatchBody = {
  predictions: Array<{
    fixtureId: number;
    home: number;
    away: number;
  }>;
};

/**
 * Response for batch saving group predictions.
 */
export type ApiSaveGroupPredictionsBatchResponse = {
  status: "success";
  message: string;
};
