/**
 * Raw response types for API-Football (api-sports.io) v3.
 * These represent the data shape as returned by the API, not internal DTOs.
 */

/* ----------------------- Shared envelope ----------------------- */

export interface AFPaging {
  current: number;
  total: number;
}

export interface AFResponse<T> {
  get: string;
  parameters: Record<string, string>;
  errors: Record<string, string> | string[];
  results: number;
  paging: AFPaging;
  response: T[];
}

/* ----------------------- Reference data ----------------------- */

export interface AFCountryRaw {
  name: string;
  code: string | null;
  flag: string | null;
}

export interface AFSeasonRaw {
  year: number;
  start: string;
  end: string;
  current: boolean;
  coverage: {
    fixtures?: {
      events?: boolean;
      lineups?: boolean;
      statistics_fixtures?: boolean;
      statistics_players?: boolean;
    };
    standings?: boolean;
    players?: boolean;
    top_scorers?: boolean;
    top_assists?: boolean;
    top_cards?: boolean;
    injuries?: boolean;
    predictions?: boolean;
    odds?: boolean;
  };
}

export interface AFLeagueCountryRaw {
  name: string;
  code: string | null;
  flag: string | null;
}

export interface AFLeagueInfoRaw {
  id: number;
  name: string;
  type: string;
  logo: string | null;
}

export interface AFLeagueRaw {
  league: AFLeagueInfoRaw;
  country: AFLeagueCountryRaw;
  seasons: AFSeasonRaw[];
}

/* ----------------------- Teams ----------------------- */

export interface AFTeamInfoRaw {
  id: number;
  name: string;
  code: string | null;
  country: string | null;
  founded: number | null;
  national: boolean;
  logo: string | null;
}

export interface AFVenueRaw {
  id: number | null;
  name: string | null;
  address: string | null;
  city: string | null;
  capacity: number | null;
  surface: string | null;
  image: string | null;
}

export interface AFTeamRaw {
  team: AFTeamInfoRaw;
  venue: AFVenueRaw | null;
}

/* ----------------------- Fixtures ----------------------- */

export interface AFFixtureInfoRaw {
  id: number;
  referee: string | null;
  timezone: string;
  date: string;
  timestamp: number;
  periods: {
    first: number | null;
    second: number | null;
  };
  venue: {
    id: number | null;
    name: string | null;
    city: string | null;
  } | null;
  status: {
    long: string;
    short: string;
    elapsed: number | null;
  };
}

export interface AFFixtureLeagueRaw {
  id: number;
  name: string;
  country: string;
  logo: string | null;
  flag: string | null;
  season: number;
  round: string | null;
}

export interface AFFixtureTeamRaw {
  id: number;
  name: string;
  logo: string | null;
  winner: boolean | null;
}

export interface AFFixtureGoalsRaw {
  home: number | null;
  away: number | null;
}

export interface AFFixtureScoreRaw {
  halftime: AFFixtureGoalsRaw;
  fulltime: AFFixtureGoalsRaw;
  extratime: AFFixtureGoalsRaw;
  penalty: AFFixtureGoalsRaw;
}

export interface AFFixtureRaw {
  fixture: AFFixtureInfoRaw;
  league: AFFixtureLeagueRaw;
  teams: {
    home: AFFixtureTeamRaw;
    away: AFFixtureTeamRaw;
  };
  goals: AFFixtureGoalsRaw;
  score: AFFixtureScoreRaw;
}

/* ----------------------- Standings ----------------------- */

export interface AFStandingTeamRaw {
  id: number;
  name: string;
  logo: string | null;
}

export interface AFStandingStatsRaw {
  played: number;
  win: number;
  draw: number;
  lose: number;
  goals: {
    for: number;
    against: number;
  };
}

export interface AFStandingRowRaw {
  rank: number;
  team: AFStandingTeamRaw;
  points: number;
  goalsDiff: number;
  group: string;
  form: string | null;
  status: string | null;
  description: string | null;
  all: AFStandingStatsRaw;
  home: AFStandingStatsRaw;
  away: AFStandingStatsRaw;
  update: string;
}

export interface AFStandingGroupRaw {
  league: {
    id: number;
    name: string;
    country: string;
    logo: string | null;
    flag: string | null;
    season: number;
    standings: AFStandingRowRaw[][];
  };
}

/* ----------------------- Odds ----------------------- */

export interface AFOddValueRaw {
  value: string;
  odd: string;
}

export interface AFOddBetRaw {
  id: number;
  name: string;
  values: AFOddValueRaw[];
}

export interface AFOddBookmakerRaw {
  id: number;
  name: string;
  bets: AFOddBetRaw[];
}

export interface AFOddsRaw {
  league: {
    id: number;
    name: string;
    country: string;
    logo: string | null;
    flag: string | null;
    season: number;
  };
  fixture: {
    id: number;
    timezone: string;
    date: string;
    timestamp: number;
  };
  update: string;
  bookmakers: AFOddBookmakerRaw[];
}

/* ----------------------- Bookmakers ----------------------- */

export interface AFBookmakerRaw {
  id: number;
  name: string;
}
