export interface FixtureStateSportmonks {
  id: number;
  name: string;
  state: string;
  developer_name: string;
  short_name: "NS" | "LIVE" | "CAN" | "FT" | "HT" | "INT";
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

export interface LeagueSportmonks {
  id: number;
  name: string;
  type: string;
  season_id: number;
  country: CountrySportmonks;
  image_path: string;
}

export interface CountrySportmonks {
  id: number;
  continent_id: number;
  name: string;
  official_name: string;
  fifa_name: string;
  latitude: string; // Keeping it as a string since the original data has it as a string
  longitude: string; // Same as latitude
  borders: string[]; // Array of country codes
  image_path: string; // URL to the country's image
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
  description: "1ST_HALF" | "2ND_HALF" | "2ND_HALF_ONLY" | "CURRENT" | "EXTRA_TIME" | "EXTRA_TIME_ONLY" | "PENALTIES";
};

type ScoreDetailSportmonks = {
  id: number;
  fixture_id: number;
  type_id: number;
  participant_id: number;
  score: ScoreParticipantSportmonks;
  description: "1ST_HALF" | "2ND_HALF" | "2ND_HALF_ONLY" | "CURRENT" | "EXTRA_TIME" | "EXTRA_TIME_ONLY" | "PENALTIES";
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
  value_type: "object" | "string" | "number" | "boolean"; // extend if needed
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
  scores: ScoreDetailSportmonks[];
  statistics?: FixtureSportmonksStatistics[];
  events?: FixtureEvent[];
  metadata?: FixtureSportmonksMetadata[];
  stage: FixtureStageSportmonks;
  round: FixtureRoundSportmonks;
}

export interface SportmonksFixturesRequest {
  path: string;
  options: {
    include?: string;
    filters?: string;
    page?: string;
    perPage?: string;
  };
  fetchAll?: boolean;
}

export interface SportmonksFixturesResponse {
  data: any;
  message?: string;
  pagination?: {
    count: number;
    current_page: number;
    per_page: number;
    next_page: string | null;
    has_more: boolean;
  };
}
