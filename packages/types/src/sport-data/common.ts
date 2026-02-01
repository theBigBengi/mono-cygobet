export type ID = number; // or string if you prefer

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
  externalId: number; // BigInt in Prisma schema
  name: string;
};

export type MarketDTO = {
  externalId: number;
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
  externalId: number; // provider season id
  name: string; // e.g. "2024/2025"
  startDate: string; // ISO date string (YYYY-MM-DD)
  endDate: string; // ISO date string (YYYY-MM-DD)
  isCurrent: boolean; // provider flag if available
  leagueExternalId: number | string; // to resolve FK -> leagues via league_mappings
  leagueName: string;
  countryName: string;
};

// Reuse your existing enum if you already have it; shown here for clarity.
export const FixtureState = {
  NS: "NS",
  LIVE: "LIVE",
  CAN: "CAN",
  FT: "FT",
  HT: "HT",
  INT: "INT",
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
  externalId: number;

  /** Display name of the fixture (we store it in fixtures.name) */
  name: string;

  /** Used only to resolve FK via league_mappings -> fixtures.league_id (nullable) */
  leagueExternalId: number | null;

  /** Used only to resolve FK via season_mappings -> fixtures.season_id (nullable) */
  seasonExternalId: number | null;

  /** Resolve via team_mappings -> fixtures.home_team_id */
  homeTeamExternalId: number;

  /** Resolve via team_mappings -> fixtures.away_team_id */
  awayTeamExternalId: number;

  /** ISO datetime string -> fixtures.start_iso */
  startIso: string;

  /** Epoch seconds -> fixtures.start_ts */
  startTs: number;

  /** Normalized to our enum -> fixtures.state */
  state: FixtureState;

  /** Provider raw result string (nullable) -> fixtures.result */
  result: string | null;

  /** Home team score (nullable) -> fixtures.home_score */
  homeScore: number | null;

  /** Away team score (nullable) -> fixtures.away_score */
  awayScore: number | null;

  /** Score at end of 90min -> fixtures.home_score_90 */
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

  hasOdds: boolean;

  leagueName: string;

  countryName: string;
};

export type OddsDTO = {
  bookmakerId: number;
  marketExternalId: number;
  externalId: number;
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
  fixtureExternalId: number;
  bookmakerExternalId: number;
  bookmakerName: string;
  marketName: string;
  fixtureName: string;
};

export type FixtureOddsDTO = FixtureDTO & {
  odds: OddsDTO[];
};
