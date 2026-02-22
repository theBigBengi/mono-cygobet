export type ID = number; // or string if you prefer

export type ExternalId = string | number;

export const MatchState = {
  Scheduled: "SCHEDULED",
  Inplay: "INPLAY",
  Finished: "FINISHED",
  Postponed: "POSTPONED",
  Canceled: "CANCELED",
} as const;

export type MatchState = (typeof MatchState)[keyof typeof MatchState];

export type CountryDTO = {
  externalId: number | string;
  name: string;
  imagePath?: string | null;
  iso2?: string | null;
  iso3?: string | null;
};

export type LeagueDTO = {
  externalId: number | string;
  name: string;
  imagePath?: string | null;
  countryExternalId?: ID | string | null;
  shortCode?: string | null;
  type?: string | null;
  subType?: string | null;
};

export type BookmakerDTO = {
  externalId: ExternalId; // BigInt in Prisma schema
  name: string;
};

export type MarketDTO = {
  externalId: ExternalId;
  name: string;
  description?: string | null;
  developerName?: string | null;
};

export type TeamDTO = {
  /** Provider’s team id -> goes to team_mappings.external_id (as string) */
  externalId: number | string;

  /** teams.name */
  name: string;

  /** teams.short_code (nullable) */
  shortCode?: string | null;

  /** teams.image_path (nullable) */
  imagePath?: string | null;

  /** teams.country_id is resolved via country_mappings on this provider id (nullable) */
  countryExternalId?: string | number | null;

  /** teams.founded (nullable) */
  founded?: number | null;

  /** teams.type (nullable) – e.g. "club" | "national" per provider */
  type?: string | null;
};

export type SeasonDTO = {
  externalId: ExternalId; // provider season id
  name: string; // e.g. "2024/2025"
  startDate: string; // ISO date string (YYYY-MM-DD)
  endDate: string; // ISO date string (YYYY-MM-DD)
  isCurrent: boolean; // provider flag if available
  isFinished?: boolean; // provider flag if season has ended
  isPending?: boolean; // provider flag if season not started yet
  leagueExternalId: ExternalId; // to resolve FK -> leagues via league_mappings
  leagueName: string;
  countryName: string;
};

/** Preview data for seeding a season - fetched in a single optimized call */
export type SeasonPreviewDTO = {
  season: {
    externalId: ExternalId;
    name: string;
  };
  league: {
    externalId: ExternalId;
    name: string;
  };
  country: {
    externalId: ExternalId;
    name: string;
  };
  teamsCount: number;
  /** Total fixtures in the season */
  fixturesCount: number;
  /** Fixtures with start date in the future */
  fixturesCountFuture: number;
};

export const FixtureState = {
  NS: "NS",
  TBA: "TBA",
  DELAYED: "DELAYED",
  AU: "AU",
  PENDING: "PENDING",
  INPLAY_1ST_HALF: "INPLAY_1ST_HALF",
  INPLAY_2ND_HALF: "INPLAY_2ND_HALF",
  INPLAY_ET: "INPLAY_ET",
  INPLAY_PENALTIES: "INPLAY_PENALTIES",
  HT: "HT",
  BREAK: "BREAK",
  EXTRA_TIME_BREAK: "EXTRA_TIME_BREAK",
  PEN_BREAK: "PEN_BREAK",
  FT: "FT",
  AET: "AET",
  FT_PEN: "FT_PEN",
  CANCELLED: "CANCELLED",
  POSTPONED: "POSTPONED",
  SUSPENDED: "SUSPENDED",
  ABANDONED: "ABANDONED",
  INTERRUPTED: "INTERRUPTED",
  WO: "WO",
  AWARDED: "AWARDED",
  DELETED: "DELETED",
} as const;

export type FixtureState = (typeof FixtureState)[keyof typeof FixtureState];

/** Period-specific score breakdown (e.g. from SportMonks scores array) */
export type FixtureScoreBreakdown = {
  home: number | null;
  away: number | null;
  home90: number | null;
  away90: number | null;
  homeET: number | null;
  awayET: number | null;
  penHome: number | null;
  penAway: number | null;
};

export type FixtureDTO = {
  /** Provider fixture id to map into fixture_mappings */
  externalId: ExternalId;

  /** Display name of the fixture (we store it in fixtures.name) */
  name: string;

  /** Used only to resolve FK via league_mappings -> fixtures.league_id (nullable) */
  leagueExternalId: ExternalId | null;

  /** Used only to resolve FK via season_mappings -> fixtures.season_id (nullable) */
  seasonExternalId: ExternalId | null;

  /** Resolve via team_mappings -> fixtures.home_team_id */
  homeTeamExternalId: ExternalId;

  /** Resolve via team_mappings -> fixtures.away_team_id */
  awayTeamExternalId: ExternalId;

  /** ISO datetime string -> fixtures.start_iso */
  startIso: string;

  /** Epoch seconds -> fixtures.start_ts */
  startTs: number;

  /** Normalized to our enum -> fixtures.state */
  state: FixtureState;

  /** Live minute when in play (nullable) -> fixtures.live_minute */
  liveMinute: number | null;

  /** Provider raw result string (nullable) -> fixtures.result */
  result: string | null;

  /** Provider current/live score (home). Not stored in DB; used only for ETL fallback to homeScore90. */
  homeScore: number | null;

  /** Provider current/live score (away). Not stored in DB; used only for ETL fallback to awayScore90. */
  awayScore: number | null;

  /** Score at end of 90min (primary). During live: current score from provider type_id 1525. */
  homeScore90?: number | null;

  /** Score at end of 90min -> fixtures.away_score_90 */
  awayScore90?: number | null;

  /** Score at end of extra time -> fixtures.home_score_et */
  homeScoreET?: number | null;

  /** Score at end of extra time -> fixtures.away_score_et */
  awayScoreET?: number | null;

  /** Penalty shootout goals (home) -> fixtures.pen_home */
  penHome?: number | null;

  /** Penalty shootout goals (away) -> fixtures.pen_away */
  penAway?: number | null;

  /** Stage name -> fixtures.stage */
  stage: string | null;

  /** Round name -> fixtures.round */
  round: string | null;

  /** Leg indicator for two-legged ties -> fixtures.leg (e.g., "1/2", "2/2", "1/1") */
  leg: string | null;

  /** Aggregate ID linking two-legged fixtures together -> fixtures.aggregate_id */
  aggregateId: ExternalId | null;

  hasOdds: boolean;

  leagueName: string;

  countryName: string;

  /** Country external ID from league.country - useful for filtering */
  countryExternalId: ExternalId | null;
};

export type OddsDTO = {
  bookmakerId: ExternalId;
  marketExternalId: ExternalId;
  externalId: ExternalId;
  name: string | null;
  value: string;
  marketDescription: string;
  winning: boolean;
  startingAt: string;
  startingAtTs: number;
  probability: string;
  total: string | null;
  handicap: string | null;
  label: string;
  sortOrder: number;
  fixtureExternalId: ExternalId;
  bookmakerExternalId: ExternalId;
  bookmakerName: string;
  marketName: string;
  fixtureName: string;
};

export type FixtureOddsDTO = FixtureDTO & {
  odds: OddsDTO[];
};

/** Standing row for a team in a league table */
export type StandingDTO = {
  /** Team external ID */
  teamExternalId: ExternalId;
  /** Team name */
  teamName: string;
  /** Team logo URL */
  teamImagePath: string | null;
  /** Team short code (e.g., "FCB", "BVB") */
  teamShortCode: string | null;
  /** Position in the table */
  position: number;
  /** Total points */
  points: number;
  /** Matches played */
  played: number;
  /** Wins */
  won: number;
  /** Draws */
  drawn: number;
  /** Losses */
  lost: number;
  /** Goals scored */
  goalsFor: number;
  /** Goals conceded */
  goalsAgainst: number;
  /** Goal difference */
  goalDifference: number;
  /** Recent form (e.g., "WWDLW") */
  form: string | null;
  /** Season external ID */
  seasonExternalId: ExternalId;
  /** League external ID */
  leagueExternalId: ExternalId;
  /** Stage external ID (for cups with multiple stages) */
  stageExternalId: ExternalId | null;
  /** Group external ID (for group stages) */
  groupExternalId: ExternalId | null;
};
