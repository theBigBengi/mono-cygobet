/**
 * Raw response types for SportMonks API.
 * These represent the data shape as returned by the API, not internal DTOs.
 * All SportMonks types used by this module live here for consistency.
 */

/* ----------------------- Raw types (reference data) ----------------------- */

export interface SmCountryRaw {
  id: number;
  name: string;
  image_path?: string | null;
  iso2?: string | null;
  iso3?: string | null;
  leagues?: Array<{ id: number }>;
}

export interface SmLeagueRawCountry {
  id: number;
  name: string;
  image_path?: string | null;
  iso2?: string | null;
  iso3?: string | null;
}

export interface SmLeagueRaw {
  id: number;
  name: string;
  image_path?: string | null;
  country_id?: number | null;
  short_code?: string | null;
  type?: string | null;
  sub_type?: string | null;
  country?: SmLeagueRawCountry;
}

export interface SmTeamRaw {
  id: number;
  name?: string | null;
  short_code?: string | null;
  image_path?: string | null;
  country_id?: number | null;
  founded?: number | null;
  type?: string | null;
}

export interface SmSeasonRawLeague {
  id?: number;
  name?: string | null;
  country_id?: number | null;
  country?: { id?: number; name?: string | null };
}

export interface SmSeasonRaw {
  id: number;
  league_id?: number | null;
  name?: string | null;
  starting_at?: string | null;
  ending_at?: string | null;
  is_current?: boolean;
  finished?: boolean;
  pending?: boolean;
  league?: SmSeasonRawLeague;
  fixtures?: FixtureSportmonks[] | Array<{ id: number; starting_at?: string }>;
  teams?: Array<{ id: number }>;
}

export interface SmBookmakerRaw {
  id: number;
  name: string;
}

export interface SmMarketRaw {
  id: number;
  name: string;
  description?: string | null;
  developer_name?: string | null;
}

/* ----------------------- Fixture raw types (API response shape) ----------------------- */

export interface FixtureStateSportmonks {
  id: number;
  name: string;
  state: string;
  developer_name: string;
  short_name: string;
}

export interface PeriodSportmonks {
  id: number;
  minutes: number;
  ticking?: boolean;
  ended?: boolean | null;
  sort_order: number;
}

export interface FixtureStageSportmonks {
  id: number;
  name: string;
}

export interface FixtureRoundSportmonks {
  id: number;
  name: string;
}

export interface MarketSportmonks {
  id: number;
  name: string;
  description: string;
  developer_name: string;
}

export interface BookmakerSportmonks {
  id: number;
  name: string;
}

export interface OddSportmonks {
  id: number;
  fixture_id: number;
  market_id: number;
  bookmaker_id: number;
  label: string;
  value: string;
  name: string | null;
  sort_order: number;
  market_description: string;
  probability: string;
  dp3: string;
  fractional: string;
  american: string;
  winning: boolean;
  stopped: boolean;
  total: string | null;
  handicap: string | null;
  participants: string | null;
  created_at: string;
  original_label: string | null;
  latest_bookmaker_update: string;
  market: MarketSportmonks;
  bookmaker: BookmakerSportmonks;
}

export interface CountrySportmonks {
  id: number;
  continent_id: number;
  name: string;
  official_name: string;
  fifa_name: string;
  latitude: string;
  longitude: string;
  borders: string[];
  image_path: string;
}

export interface LeagueSportmonks {
  id: number;
  name: string;
  type: string;
  season_id: number;
  country: CountrySportmonks;
  image_path: string;
}

type ScoreParticipantSportmonks = {
  goals: number;
  participant: "home" | "away";
};

export type ScoreSportmonks = {
  id: number;
  fixture_id: number;
  type_id: number;
  participant_id: number;
  score: ScoreParticipantSportmonks;
  description:
    | "1ST_HALF"
    | "2ND_HALF"
    | "2ND_HALF_ONLY"
    | "CURRENT"
    | "EXTRA_TIME"
    | "EXTRA_TIME_ONLY"
    | "PENALTIES";
};

type ScoreDetailSportmonks = {
  id: number;
  fixture_id: number;
  type_id: number;
  participant_id: number;
  score: ScoreParticipantSportmonks;
  description:
    | "1ST_HALF"
    | "2ND_HALF"
    | "2ND_HALF_ONLY"
    | "CURRENT"
    | "EXTRA_TIME"
    | "EXTRA_TIME_ONLY"
    | "PENALTIES";
};

export interface ParticipantMeta {
  location: "home" | "away";
  winner: boolean | null;
  position: number;
}

export interface ParticipantsSportmonks {
  id: number;
  sport_id: number;
  country_id: number;
  venue_id: number;
  gender: string;
  name: string;
  short_code: string | null;
  image_path: string;
  founded: number;
  type: string;
  placeholder: boolean;
  last_played_at: string;
  meta: ParticipantMeta;
}

export interface FixtureEvent {
  id: number;
  fixture_id: number;
  period_id: number;
  participant_id: number;
  type_id: number;
  section: "event" | string;
  player_id: number | null;
  related_player_id: number | null;
  player_name: string | null;
  related_player_name: string | null;
  result: string | null;
  info: string | null;
  addition: string | null;
  minute: number;
  extra_minute: number | null;
  injured: boolean | null;
  on_bench: boolean;
  coach_id: number | null;
  sub_type_id: number | null;
  detailed_period_id: number | null;
  sort_order: number;
  type: {
    id: number;
    name: string;
  };
}

export interface FixtureSportmonksStatistics {
  id: number;
  fixture_id: number;
  type_id: number;
  participant_id: number;
  location: "home" | "away";
  data: {
    value: number;
  };
  type: {
    id: number;
    name: string;
    code: string;
    developer_name: string;
    model_type: "statistic";
    stat_group: string;
  };
}

export type FixtureSportmonksMetadataType = {
  id: number;
  name: string;
  code: string;
  developer_name: string;
  model_type: string;
  stat_group: string | null;
};

export type FixtureSportmonksMetadata = {
  id: number;
  metadatable_id: number;
  type_id: number;
  value_type: "object" | "string" | "number" | "boolean";
  values: {
    [key: string]: string | number | boolean;
  };
  type?: FixtureSportmonksMetadataType;
};

export interface FixtureSportmonks {
  id: number;
  sport_id: number;
  league_id: number;
  season_id: number;
  stage_id: number;
  group_id: number | null;
  aggregate_id: number | null;
  round_id: number;
  state_id: number;
  league: LeagueSportmonks;
  venue_id: number;
  name: string;
  starting_at: string;
  result_info: string | null;
  leg: string;
  details: string | null;
  length: number;
  placeholder: boolean;
  has_odds: boolean;
  has_premium_odds: boolean;
  starting_at_timestamp: number;
  odds: OddSportmonks[];
  participants: ParticipantsSportmonks[];
  state: FixtureStateSportmonks;
  periods?: PeriodSportmonks[];
  scores: ScoreDetailSportmonks[];
  statistics?: FixtureSportmonksStatistics[];
  events?: FixtureEvent[];
  metadata?: FixtureSportmonksMetadata[];
  stage: FixtureStageSportmonks;
  round: FixtureRoundSportmonks;
}

/** Standing detail item (wins, goals, etc.) */
export interface StandingDetailSportmonks {
  id: number;
  standing_id: number;
  type_id: number;
  value: number;
}

/** Team/Participant in standings */
export interface StandingParticipantSportmonks {
  id: number;
  name: string;
  short_code: string | null;
  image_path: string | null;
}

/** Standing row from SportMonks API */
export interface StandingSportmonks {
  id: number;
  participant_id: number;
  sport_id: number;
  league_id: number;
  season_id: number;
  stage_id: number | null;
  group_id: number | null;
  round_id: number | null;
  position: number;
  points: number;
  result: string | null;
  participant?: StandingParticipantSportmonks;
  details?: StandingDetailSportmonks[];
}
