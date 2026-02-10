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
    liveMinute?: number | null;
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
    homeTeam?: {
      id: number;
      name: string;
      imagePath: string | null;
      firstKitColor?: string | null;
      secondKitColor?: string | null;
      thirdKitColor?: string | null;
    };
    awayTeam?: {
      id: number;
      name: string;
      imagePath: string | null;
      firstKitColor?: string | null;
      secondKitColor?: string | null;
      thirdKitColor?: string | null;
    };
    result?: string | null;
    homeScore90?: number | null;
    awayScore90?: number | null;
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
      points: number | null;
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
  includeCountry?: boolean;
  preset?: "popular";
  search?: string;
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
  country?: ApiCountryItem | null;
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
  preset?: "popular";
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
 * Who can access the invite link: all members or admins/owner only.
 */
export type ApiInviteAccess = "all" | "admin_only";

/**
 * Body for creating a group.
 */
export type ApiCreateGroupBody = {
  name: string;
  description?: string | null;
  privacy?: ApiGroupPrivacy;
  /** Used when selectionMode is "games". */
  fixtureIds?: number[];
  /** "games" | "teams" | "leagues". Default "games" if omitted. */
  selectionMode?: "games" | "teams" | "leagues";
  /** Used when selectionMode is "teams". */
  teamIds?: number[];
  /** Used when selectionMode is "leagues". Exactly one league. */
  leagueIds?: number[];
  /** Who can access the invite link. Default "all". */
  inviteAccess?: ApiInviteAccess;
};

/**
 * Body for updating a group.
 */
export type ApiUpdateGroupBody = {
  name?: string;
  description?: string;
  privacy?: ApiGroupPrivacy;
  fixtureIds?: number[];
  inviteAccess?: ApiInviteAccess;
  /** Whether members can nudge each other for upcoming games. */
  nudgeEnabled?: boolean;
  /** Minutes before kickoff within which nudge is allowed (15–1440). */
  nudgeWindowMinutes?: number;
  /** Scoring: points for exact result. Only editable before first game starts. */
  onTheNosePoints?: number;
  /** Scoring: points for correct goal difference. Only editable before first game starts. */
  correctDifferencePoints?: number;
  /** Scoring: points for correct outcome. Only editable before first game starts. */
  outcomePoints?: number;
};

/**
 * Body for publishing a group.
 */
export type ApiPublishGroupBody = {
  name?: string;
  description?: string;
  privacy?: ApiGroupPrivacy;
  onTheNosePoints?: number;
  correctDifferencePoints?: number;
  outcomePoints?: number;
  predictionMode?: string;
  koRoundMode?: string;
  inviteAccess?: ApiInviteAccess;
  /** Maximum number of members in the group. Default 50. */
  maxMembers?: number;
  /** Whether members can nudge each other for upcoming games. */
  nudgeEnabled?: boolean;
  /** Minutes before kickoff within which nudge is allowed (15–1440). */
  nudgeWindowMinutes?: number;
};

/**
 * Response from publishing a group.
 */
export type ApiPublishGroupResponse = ApiGroupResponse;

/**
 * Response from POST /api/groups/:id/leave.
 */
export type ApiLeaveGroupResponse = { success: boolean };

/**
 * Body for joining a group by invite code.
 */
export type ApiJoinGroupByCodeBody = { code: string };

/**
 * Response from GET/POST invite-code endpoints.
 */
export type ApiInviteCodeResponse = {
  status: "success";
  data: { inviteCode: string };
  message: string;
};

/**
 * Group item returned by group endpoints.
 */
export type ApiGroupItem = {
  id: number;
  name: string;
  description?: string | null;
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
   * Included for draft groups and active/ended groups.
   */
  firstGame?: ApiFixturesListResponse["data"][0] | null;
  /**
   * The last game of the group (latest fixture).
   * Included for active/ended groups (and optionally draft).
   */
  lastGame?: ApiFixturesListResponse["data"][0] | null;
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
   * Number of completed (FT) fixtures in the group.
   * Only included for active/ended groups.
   */
  completedFixturesCount?: number;
  /**
   * Whether there are upcoming games that need predictions.
   * Only included for active/ended groups.
   */
  hasUnpredictedGames?: boolean;
  /**
   * Total NS games the user has not predicted. Only for active/ended groups.
   */
  unpredictedGamesCount?: number;
  /**
   * Games with kickoff today (any state). Only for active/ended groups.
   */
  todayGamesCount?: number;
  /**
   * Today's NS games the user has not predicted. Only for active/ended groups.
   */
  todayUnpredictedCount?: number;
  /**
   * Games currently in LIVE state. Only for active/ended groups.
   */
  liveGamesCount?: number;
  /** Who can access the invite link. */
  inviteAccess?: ApiInviteAccess;
  /** Maximum number of members allowed in the group. */
  maxMembers?: number;
  /**
   * Invite code for the group (if generated). Only present when relevant.
   */
  inviteCode?: string | null;
  /** Prediction mode: "CorrectScore" (exact result) | "MatchWinner" (1/X/2) */
  predictionMode?: string;
  /** Selection mode: "games" | "teams" | "leagues" - determines filter chip types */
  selectionMode?: "games" | "teams" | "leagues";
  /** Team IDs the group follows (teams mode). Used to filter team avatar chips. */
  groupTeamsIds?: number[];
  /** KO round mode: "FullTime" | "ExtraTime" | "Penalties" - TODO: koRoundMode not yet used in scoring */
  koRoundMode?: string;
  onTheNosePoints?: number;
  correctDifferencePoints?: number;
  outcomePoints?: number;
  /** Whether nudge is enabled for this group. */
  nudgeEnabled?: boolean;
  /** Nudge window in minutes before kickoff. */
  nudgeWindowMinutes?: number;
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
 * Query parameters for GET /api/groups/public.
 */
export type ApiPublicGroupsQuery = {
  page?: number;
  perPage?: number;
  /** Search by group name (case-insensitive). */
  search?: string;
};

/**
 * Public group item in GET /api/groups/public response.
 */
export type ApiPublicGroupItem = {
  id: number;
  name: string;
  memberCount: number;
  maxMembers: number | null;
  totalFixtures: number;
  creatorUsername: string | null;
  createdAt: string;
};

/**
 * Response from GET /api/groups/public.
 */
export type ApiPublicGroupsResponse = {
  status: "success";
  data: ApiPublicGroupItem[];
  pagination: {
    page: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
  };
};

/**
 * Group member item in GET /api/groups/:id/members response.
 */
export type ApiGroupMemberItem = {
  userId: number;
  username: string | null;
  role: "owner" | "admin" | "member";
  joinedAt: string; // ISO timestamp
};

/**
 * Response from GET /api/groups/:id/members.
 */
export type ApiGroupMembersResponse = {
  status: "success";
  data: ApiGroupMemberItem[];
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
  saved: Array<{ fixtureId: number }>;
  rejected: Array<{ fixtureId: number; reason: string }>;
};

/**
 * League item in GET /api/groups/:id/games-filters response.
 */
export type ApiGroupGamesFiltersLeagueItem = {
  id: number;
  name: string;
  imagePath: string | null;
  country?: ApiCountryItem | null;
};

/**
 * Filters payload in games-filters response.
 * For mode "leagues": primary "round" + rounds (raw strings, e.g. "12", "Quarter-finals").
 * For mode "teams" | "games": no rounds.
 */
export type ApiGroupGamesFiltersFilters =
  | { primary: "round"; rounds: string[] }
  | Record<string, never>;

/**
 * Data payload for games-filters response.
 * Explicit shape: mode, filters, leagues.
 */
export type ApiGroupGamesFiltersData = {
  mode: "leagues" | "teams" | "games";
  filters: ApiGroupGamesFiltersFilters;
  leagues: ApiGroupGamesFiltersLeagueItem[];
};

/**
 * Response from GET /api/groups/:id/games-filters.
 */
export type ApiGroupGamesFiltersResponse = {
  status: "success";
  data: ApiGroupGamesFiltersData;
  message: string;
};

/**
 * Participant item in predictions overview.
 */
export type ApiPredictionsOverviewParticipant = {
  id: number; // user id
  username: string | null;
  number: number; // position/order in group (1, 2, 3...)
  totalPoints: number;
};

/**
 * Fixture item in predictions overview.
 */
export type ApiPredictionsOverviewFixture = {
  id: number;
  name: string;
  homeTeam: {
    id: number;
    name: string;
    imagePath: string | null;
    firstKitColor?: string | null;
    secondKitColor?: string | null;
    thirdKitColor?: string | null;
  };
  awayTeam: {
    id: number;
    name: string;
    imagePath: string | null;
    firstKitColor?: string | null;
    secondKitColor?: string | null;
    thirdKitColor?: string | null;
  };
  result: string | null; // final score (e.g., "2:1")
  startTs: number;
  state: string;
  liveMinute?: number | null;
  homeScore90?: number | null;
  awayScore90?: number | null;
};

/**
 * Data payload for predictions overview response.
 * Predictions map: key is `${userId}_${fixtureId}`, value is "home:away" or null if no prediction.
 */
export type ApiPredictionsOverviewData = {
  participants: ApiPredictionsOverviewParticipant[];
  fixtures: ApiPredictionsOverviewFixture[];
  predictions: Record<string, string | null>; // `${userId}_${fixtureId}` -> "home:away" | null
  predictionPoints: Record<string, string | null>; // `${userId}_${fixtureId}` -> points string or null
};

/**
 * Response from GET /api/groups/:id/predictions-overview.
 */
export type ApiPredictionsOverviewResponse = {
  status: "success";
  data: ApiPredictionsOverviewData;
  message: string;
};

/**
 * Ranking item in group ranking response.
 */
export type ApiRankingItem = {
  rank: number;
  userId: number;
  username: string | null;
  totalPoints: number;
  predictionCount: number;
  correctScoreCount: number;
  correctOutcomeCount: number;
  /** True if this member has no prediction for an upcoming fixture in the nudge window. */
  nudgeable?: boolean;
  /** Earliest fixture id in the nudge window they have not predicted. */
  nudgeFixtureId?: number;
  /** True if the current user already nudged this member for that fixture. */
  nudgedByMe?: boolean;
  /** Phase 2: number of nudges received (for sleeper badge). */
  nudgeReceivedCount?: number;
};

/**
 * Body for POST /api/groups/:id/nudge.
 */
export type ApiNudgeBody = {
  targetUserId: number;
  fixtureId: number;
};

/**
 * Response from POST /api/groups/:id/nudge.
 */
export type ApiNudgeResponse = {
  status: "success";
  message: string;
  /** Phase 2: daily nudges remaining. */
  remaining?: number;
};

/**
 * Response from GET /api/groups/:id/ranking.
 */
export type ApiRankingResponse = {
  status: "success";
  data: ApiRankingItem[];
  message: string;
};

/**
 * Activity feed item (cross-group system events + user-specific reminders).
 */
export type ApiActivityFeedItem = {
  id: number;
  createdAt: string;
  groupId: number | null;
  groupName: string;
  eventType: string;
  body: string;
  meta: Record<string, unknown> | null;
  source: "group" | "user";
};

/**
 * Response from GET /api/activity.
 */
export type ApiActivityFeedResponse = {
  status: "success";
  data: {
    items: ApiActivityFeedItem[];
    hasMore: boolean;
  };
};

/**
 * Prediction item in GET /api/fixtures/:id response (user's prediction in one group).
 */
export type ApiFixtureDetailPrediction = {
  groupId: number;
  groupName: string;
  prediction: string;
  settled: boolean;
  points: number | null;
  predictionMode: string;
};

/**
 * Data payload for GET /api/fixtures/:id response.
 */
export type ApiFixtureDetailData = {
  id: number;
  name: string;
  kickoffAt: string;
  startTs: number;
  state: string;
  stage: string | null;
  round: string | null;
  liveMinute: number | null;
  result: string | null;
  homeScore90: number | null;
  awayScore90: number | null;
  homeScoreET: number | null;
  awayScoreET: number | null;
  penHome: number | null;
  penAway: number | null;
  homeTeam: {
    id: number;
    name: string;
    imagePath: string | null;
    firstKitColor?: string | null;
    secondKitColor?: string | null;
    thirdKitColor?: string | null;
  };
  awayTeam: {
    id: number;
    name: string;
    imagePath: string | null;
    firstKitColor?: string | null;
    secondKitColor?: string | null;
    thirdKitColor?: string | null;
  };
  league: { id: number; name: string; imagePath: string | null } | null;
  country: { id: number; name: string; imagePath: string | null } | null;
  predictions: ApiFixtureDetailPrediction[];
};

/**
 * Response from GET /api/fixtures/:id.
 */
export type ApiFixtureDetailResponse = {
  status: "success";
  data: ApiFixtureDetailData;
};

/** Item in GET /api/fixtures/:id/my-predictions (user's prediction per group). */
export type ApiMyPredictionForFixtureItem = {
  groupId: number;
  groupName: string;
  prediction: { home: number; away: number } | null;
  points: number | null;
  isSettled: boolean;
};

/** Response from GET /api/fixtures/:id/my-predictions. */
export type ApiMyPredictionsForFixtureResponse = {
  status: "success";
  data: ApiMyPredictionForFixtureItem[];
};

// --- User Stats ---

/** Badge IDs for user profile stats. */
export type ApiBadgeId =
  | "sharpshooter"
  | "underdog_caller"
  | "streak_master"
  | "group_champion"
  | "consistency_king"
  | "early_bird";

/** Badge with earned status, progress (0-100), and current/target values. */
export type ApiBadge = {
  id: ApiBadgeId;
  name: string;
  description: string;
  earned: boolean;
  progress: number;
  current: number;
  target: number;
};

/** Prediction distribution: exact / difference / outcome / miss. */
export type ApiPredictionDistribution = {
  exact: number;
  difference: number;
  outcome: number;
  miss: number;
};

/** Form item (last 10 settled predictions). */
export type ApiFormItem = {
  fixtureId: number;
  points: number;
  result: "exact" | "difference" | "outcome" | "miss";
};

/** Per-group stat for user profile. */
export type ApiUserGroupStat = {
  groupId: number;
  groupName: string;
  groupStatus: string;
  rank: number;
  totalPoints: number;
  predictionCount: number;
  correctScoreCount: number;
  accuracy: number;
  recentPoints: number[];
};

/** Insight for profile (streak, ranking, league, etc.). */
export type ApiInsight = {
  type: "streak" | "ranking" | "league" | "improvement" | "milestone";
  icon: string;
  text: string;
  textHe: string;
};

/** Main user stats response data. */
export type ApiUserStatsData = {
  user: { id: number; username: string | null; image: string | null };
  overall: {
    totalPoints: number;
    totalPredictions: number;
    settledPredictions: number;
    exactScores: number;
    accuracy: number;
    groupsPlayed: number;
    bestRank: number | null;
    currentStreak: number;
    bestStreak: number;
    percentile: number;
  };
  distribution: ApiPredictionDistribution;
  form: ApiFormItem[];
  badges: ApiBadge[];
  groups: ApiUserGroupStat[];
  insights: ApiInsight[];
  bestLeague: {
    leagueId: number;
    leagueName: string;
    accuracy: number;
  } | null;
};

/** Response from GET /api/users/:id/stats. */
export type ApiUserStatsResponse = {
  status: "success";
  data: ApiUserStatsData;
  message: string;
};

/** Shared group in head-to-head comparison. */
export type ApiHeadToHeadSharedGroup = {
  groupId: number;
  groupName: string;
  userRank: number;
  userPoints: number;
  opponentRank: number;
  opponentPoints: number;
};

/** Head-to-head comparison data. */
export type ApiHeadToHeadData = {
  user: { id: number; username: string | null };
  opponent: { id: number; username: string | null };
  sharedGroups: ApiHeadToHeadSharedGroup[];
  summary: {
    userTotalPoints: number;
    opponentTotalPoints: number;
    userExactScores: number;
    opponentExactScores: number;
    userAccuracy: number;
    opponentAccuracy: number;
    userWins: number;
    opponentWins: number;
    ties: number;
  };
};

/** Response from GET /api/users/:id/head-to-head/:opponentId. */
export type ApiHeadToHeadResponse = {
  status: "success";
  data: ApiHeadToHeadData;
  message: string;
};

/** Opponent item for H2H opponent list. */
export type ApiH2HOpponentItem = {
  id: number;
  username: string | null;
};

/** Response from GET /api/users/:id/h2h-opponents. */
export type ApiH2HOpponentsResponse = {
  status: "success";
  data: { opponents: ApiH2HOpponentItem[] };
  message: string;
};

/**
 * Body for POST /api/groups/preview.
 * Simulates fixture resolution and returns summary stats.
 */
export type ApiGroupPreviewBody = {
  selectionMode: "games" | "teams" | "leagues";
  fixtureIds?: number[];
  teamIds?: number[];
  leagueIds?: number[];
};

/**
 * Response data from POST /api/groups/preview.
 */
export type ApiGroupPreviewData = {
  fixtureCount: number;
  leagueCount: number;
  teamCount: number;
  startDate: string | null;
  endDate: string | null;
};

export type ApiGroupPreviewResponse = {
  status: "success";
  data: ApiGroupPreviewData;
};

export * from "./gamification";
