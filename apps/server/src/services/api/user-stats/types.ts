// user-stats/types.ts
// Internal raw SQL row types for user stats queries.

export type RawOverallRow = {
  user_id: number;
  username: string | null;
  image: string | null;
  total_points: string | number | bigint;
  prediction_count: string | number | bigint;
  settled_count: string | number | bigint;
  correct_score_count: string | number | bigint;
  correct_outcome_count: string | number | bigint;
};

export type RawGroupStatRow = {
  group_id: number;
  group_name: string;
  group_status: string;
  total_points: string | number | bigint;
  prediction_count: string | number | bigint;
  settled_count: string | number | bigint;
  correct_score_count: string | number | bigint;
  correct_outcome_count: string | number | bigint;
};

export type RawRankRow = {
  user_id: number;
  group_id: number;
  rank_val: string | number | bigint;
};

export type RawFormRow = {
  fixture_id: number;
  points: string | number | bigint;
  winning_correct_score: boolean;
  winning_match_winner: boolean;
};

export type RawDistributionRow = {
  exact_count: string | number | bigint;
  difference_count: string | number | bigint;
  outcome_count: string | number | bigint;
  miss_count: string | number | bigint;
};

export type RawSparklineRow = {
  group_id: number;
  points: string | number | bigint;
  settled_at: Date;
};

export type RawStreakRow = {
  points: string | number | bigint;
  settled_at: Date;
};

export type RawUnderdogRow = {
  count_val: string | number | bigint;
};

export type RawEarlyBirdRow = {
  count_val: string | number | bigint;
};

export type RawGroupChampionRow = {
  group_id: number;
};

export type RawH2HSharedGroupRow = {
  group_id: number;
  group_name: string;
};

export type RawH2HUserStatsRow = {
  user_id: number;
  group_id: number;
  total_points: string | number | bigint;
  correct_score_count: string | number | bigint;
  prediction_count: string | number | bigint;
};

export type RawPotentialOpponentRow = {
  user_id: number;
  username: string | null;
};

export type RawBestRankRow = {
  best_rank: string | number | bigint;
};

export type RawPercentileRow = {
  percentile: string | number | bigint;
};

export type RawBestLeagueRow = {
  league_id: number;
  league_name: string;
  accuracy: string | number | bigint;
};

export type RawSeasonStatsRow = {
  accuracy: string | number | bigint;
  exact_scores: string | number | bigint;
  total_predictions: string | number | bigint;
  points: string | number | bigint;
};
