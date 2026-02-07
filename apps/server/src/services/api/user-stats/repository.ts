// user-stats/repository.ts
// Raw SQL queries for user stats. Uses prisma.$queryRaw (same pattern as ranking.ts).

import { prisma, Prisma } from "@repo/db";
import type {
  RawOverallRow,
  RawGroupStatRow,
  RawRankRow,
  RawFormRow,
  RawDistributionRow,
  RawSparklineRow,
  RawStreakRow,
  RawUnderdogRow,
  RawEarlyBirdRow,
  RawGroupChampionRow,
  RawH2HSharedGroupRow,
  RawH2HUserStatsRow,
  RawPotentialOpponentRow,
  RawBestRankRow,
  RawPercentileRow,
  RawBestLeagueRow,
  RawSeasonStatsRow,
} from "./types";

export function toNumber(value: string | number | bigint): number {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return parseInt(value, 10) || 0;
  return 0;
}

/** Overall stats: SUM points, COUNT predictions/exact/outcome across all groups for a user. */
export async function findOverallStats(userId: number) {
  const rows = await prisma.$queryRaw<RawOverallRow[]>`
    SELECT
      u.id AS user_id,
      u.username,
      u.image,
      COALESCE(SUM(CAST(gp.points AS INTEGER)), 0) AS total_points,
      COUNT(gp.id)::int AS prediction_count,
      COUNT(gp.settled_at)::int AS settled_count,
      COUNT(CASE WHEN gp.winning_correct_score = true THEN 1 END)::int AS correct_score_count,
      COUNT(CASE WHEN gp.winning_match_winner = true THEN 1 END)::int AS correct_outcome_count
    FROM users u
    LEFT JOIN group_predictions gp ON gp.user_id = u.id
    LEFT JOIN group_members gm ON gm.group_id = gp.group_id AND gm.user_id = gp.user_id AND gm.status = 'joined'::group_members_status
    WHERE u.id = ${userId}
      AND (gp.id IS NULL OR gm.id IS NOT NULL)
    GROUP BY u.id, u.username, u.image
  `;
  return rows[0] ?? null;
}

/** Per-group stats: Same aggregation GROUP BY group_id with group name. */
export async function findPerGroupStats(userId: number) {
  return prisma.$queryRaw<RawGroupStatRow[]>`
    SELECT
      g.id AS group_id,
      g.name AS group_name,
      g.status::text AS group_status,
      COALESCE(SUM(CAST(gp.points AS INTEGER)), 0) AS total_points,
      COUNT(gp.id)::int AS prediction_count,
      COUNT(gp.settled_at)::int AS settled_count,
      COUNT(CASE WHEN gp.winning_correct_score = true THEN 1 END)::int AS correct_score_count,
      COUNT(CASE WHEN gp.winning_match_winner = true THEN 1 END)::int AS correct_outcome_count
    FROM group_members gm
    JOIN groups g ON g.id = gm.group_id
    LEFT JOIN group_predictions gp ON gp.group_id = gm.group_id AND gp.user_id = gm.user_id
    WHERE gm.user_id = ${userId}
      AND gm.status = 'joined'::group_members_status
    GROUP BY g.id, g.name, g.status
  `;
}

/** Ranks per group: RANK() OVER (PARTITION BY group_id ORDER BY total_points DESC). */
export async function findRanksPerGroup(userId: number) {
  return prisma.$queryRaw<RawRankRow[]>`
    WITH ranked AS (
      SELECT
        gp.user_id,
        gp.group_id,
        RANK() OVER (
          PARTITION BY gp.group_id
          ORDER BY COALESCE(SUM(CAST(gp.points AS INTEGER)), 0) DESC,
                   COUNT(CASE WHEN gp.winning_correct_score = true THEN 1 END) DESC
        ) AS rank_val
      FROM group_predictions gp
      JOIN group_members gm ON gm.group_id = gp.group_id AND gm.user_id = gp.user_id
      WHERE gm.status = 'joined'::group_members_status
      GROUP BY gp.user_id, gp.group_id
    )
    SELECT * FROM ranked WHERE user_id = ${userId}
  `;
}

/** Prediction distribution: exact / difference / outcome / miss. Uses group rules for point mapping. */
export async function findDistribution(userId: number) {
  const rows = await prisma.$queryRaw<RawDistributionRow[]>`
    SELECT
      COUNT(CASE WHEN gp.winning_correct_score = true THEN 1 END)::int AS exact_count,
      COUNT(CASE
        WHEN gp.winning_match_winner = true AND gp.winning_correct_score = false
         AND CAST(gp.points AS INTEGER) = gr.correct_difference_points
        THEN 1
      END)::int AS difference_count,
      COUNT(CASE
        WHEN gp.winning_match_winner = true AND gp.winning_correct_score = false
         AND CAST(gp.points AS INTEGER) = gr.outcome_points
        THEN 1
      END)::int AS outcome_count,
      COUNT(CASE WHEN CAST(gp.points AS INTEGER) = 0 THEN 1 END)::int AS miss_count
    FROM group_predictions gp
    LEFT JOIN group_members gm ON gm.group_id = gp.group_id AND gm.user_id = gp.user_id AND gm.status = 'joined'::group_members_status
    LEFT JOIN group_rules gr ON gr.group_id = gp.group_id
    WHERE gp.user_id = ${userId}
      AND gp.settled_at IS NOT NULL
      AND (gm.id IS NOT NULL)
  `;
  return (
    rows[0] ?? {
      exact_count: 0,
      difference_count: 0,
      outcome_count: 0,
      miss_count: 0,
    }
  );
}

/** Recent form: Last 10 settled predictions ORDER BY settled_at DESC. */
export async function findRecentForm(userId: number) {
  return prisma.$queryRaw<RawFormRow[]>`
    SELECT
      gf.fixture_id,
      CAST(gp.points AS INTEGER) AS points,
      gp.winning_correct_score,
      gp.winning_match_winner
    FROM group_predictions gp
    JOIN group_members gm ON gm.group_id = gp.group_id AND gm.user_id = gp.user_id AND gm.status = 'joined'::group_members_status
    JOIN group_fixtures gf ON gf.id = gp.group_fixture_id AND gf.group_id = gp.group_id
    WHERE gp.user_id = ${userId}
      AND gp.settled_at IS NOT NULL
    ORDER BY gp.settled_at DESC
    LIMIT 10
  `;
}

/** Sparkline: Last 8 settled points per group for mini-charts. */
export async function findSparklineData(userId: number) {
  return prisma.$queryRaw<RawSparklineRow[]>`
    WITH ordered AS (
      SELECT
        gp.group_id,
        CAST(gp.points AS INTEGER) AS points,
        gp.settled_at,
        ROW_NUMBER() OVER (
          PARTITION BY gp.group_id
          ORDER BY gp.settled_at DESC
        ) AS rn
      FROM group_predictions gp
      WHERE gp.user_id = ${userId}
        AND gp.settled_at IS NOT NULL
    )
    SELECT group_id, points, settled_at
    FROM ordered
    WHERE rn <= 8
    ORDER BY group_id, settled_at ASC
  `;
}

/** Streak: All settled predictions ordered by settled_at ASC for max consecutive scoring streak. */
export async function findStreakData(userId: number) {
  return prisma.$queryRaw<RawStreakRow[]>`
    SELECT
      CAST(gp.points AS INTEGER) AS points,
      gp.settled_at
    FROM group_predictions gp
    LEFT JOIN group_members gm ON gm.group_id = gp.group_id AND gm.user_id = gp.user_id AND gm.status = 'joined'::group_members_status
    WHERE gp.user_id = ${userId}
      AND gp.settled_at IS NOT NULL
      AND gm.id IS NOT NULL
    ORDER BY gp.settled_at ASC
  `;
}

/** Best rank: Minimum rank across all groups for this user. */
export async function findBestRank(userId: number): Promise<number | null> {
  const rows = await prisma.$queryRaw<RawBestRankRow[]>`
    WITH ranked AS (
      SELECT
        gp.user_id,
        gp.group_id,
        RANK() OVER (
          PARTITION BY gp.group_id
          ORDER BY COALESCE(SUM(CAST(gp.points AS INTEGER)), 0) DESC,
                   COUNT(CASE WHEN gp.winning_correct_score = true THEN 1 END) DESC
        ) AS rank_val
      FROM group_predictions gp
      JOIN group_members gm ON gm.group_id = gp.group_id AND gm.user_id = gp.user_id
      WHERE gm.status = 'joined'::group_members_status
      GROUP BY gp.user_id, gp.group_id
    )
    SELECT MIN(rank_val)::int AS best_rank
    FROM ranked
    WHERE user_id = ${userId}
  `;
  const val = rows[0]?.best_rank;
  if (val == null) return null;
  return toNumber(val);
}

/** Streak rows ordered by settled_at DESC for current streak (count consecutive scoring from most recent). */
export async function findStreakDataDesc(userId: number) {
  return prisma.$queryRaw<RawStreakRow[]>`
    SELECT
      CAST(gp.points AS INTEGER) AS points,
      gp.settled_at
    FROM group_predictions gp
    LEFT JOIN group_members gm ON gm.group_id = gp.group_id AND gm.user_id = gp.user_id AND gm.status = 'joined'::group_members_status
    WHERE gp.user_id = ${userId}
      AND gp.settled_at IS NOT NULL
      AND gm.id IS NOT NULL
    ORDER BY gp.settled_at DESC
  `;
}

/** Percentile: top X% (0-100). Higher = better. Based on total points across all groups. */
export async function findPercentile(userId: number): Promise<number> {
  const rows = await prisma.$queryRaw<RawPercentileRow[]>`
    WITH user_totals AS (
      SELECT
        gp.user_id,
        COALESCE(SUM(CAST(gp.points AS INTEGER)), 0) AS total_points
      FROM group_predictions gp
      JOIN group_members gm ON gm.group_id = gp.group_id AND gm.user_id = gp.user_id
      WHERE gm.status = 'joined'::group_members_status
      GROUP BY gp.user_id
    ),
    total_count AS (
      SELECT COUNT(*)::int AS n FROM user_totals
    ),
    user_points AS (
      SELECT total_points FROM user_totals WHERE user_id = ${userId}
    ),
    worse_count AS (
      SELECT COUNT(*)::int AS n
      FROM user_totals ut
      CROSS JOIN user_points up
      WHERE ut.total_points < up.total_points
    )
    SELECT
      CASE
        WHEN tc.n = 0 THEN 0
        ELSE ROUND(100.0 * wc.n / tc.n)::int
      END AS percentile
    FROM total_count tc
    CROSS JOIN (SELECT COALESCE(MAX(n), 0) AS n FROM worse_count) wc
  `;
  const val = rows[0]?.percentile;
  return val != null ? Math.min(100, Math.max(0, toNumber(val))) : 0;
}

/** Best league by accuracy for this user (settled predictions only). */
export async function findBestLeague(userId: number): Promise<{
  leagueId: number;
  leagueName: string;
  accuracy: number;
} | null> {
  const rows = await prisma.$queryRaw<RawBestLeagueRow[]>`
    WITH by_league AS (
      SELECT
        f.league_id,
        l.name AS league_name,
        COUNT(gp.id)::int AS total,
        COUNT(CASE WHEN gp.winning_correct_score = true OR gp.winning_match_winner = true THEN 1 END)::int AS correct
      FROM group_predictions gp
      JOIN group_members gm ON gm.group_id = gp.group_id AND gm.user_id = gp.user_id AND gm.status = 'joined'::group_members_status
      JOIN group_fixtures gf ON gf.id = gp.group_fixture_id AND gf.group_id = gp.group_id
      JOIN fixtures f ON f.id = gf.fixture_id
      LEFT JOIN leagues l ON l.id = f.league_id
      WHERE gp.user_id = ${userId}
        AND gp.settled_at IS NOT NULL
        AND f.league_id IS NOT NULL
        AND l.id IS NOT NULL
      GROUP BY f.league_id, l.name
    )
    SELECT
      league_id,
      league_name,
      (CASE WHEN total = 0 THEN 0 ELSE ROUND(100.0 * correct / total)::int END) AS accuracy
    FROM by_league
    ORDER BY accuracy DESC, total DESC
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    leagueId: row.league_id,
    leagueName: row.league_name,
    accuracy: toNumber(row.accuracy),
  };
}

/**
 * Underdog wins: Predictions with points > 0 where pre-match odds probability < 0.30.
 * v1: Returns 0 if odds linkage is complex. Odds table has probability per fixture;
 * mapping prediction outcome to odds row requires 1X2 market logic.
 */
export async function findUnderdogWinsCount(userId: number): Promise<number> {
  // v1: Skip odds join - return 0 until odds linkage is validated
  const rows = await prisma.$queryRaw<RawUnderdogRow[]>`
    SELECT 0::int AS count_val
    WHERE false
  `;
  return rows[0] ? toNumber(rows[0].count_val) : 0;
}

/** Early bird: Predictions placed 24h+ before kickoff. */
export async function findEarlyBirdCount(userId: number) {
  const rows = await prisma.$queryRaw<RawEarlyBirdRow[]>`
    SELECT COUNT(*)::int AS count_val
    FROM group_predictions gp
    JOIN group_fixtures gf ON gf.id = gp.group_fixture_id AND gf.group_id = gp.group_id
    JOIN fixtures f ON f.id = gf.fixture_id
    WHERE gp.user_id = ${userId}
      AND gp.placed_at < (to_timestamp(f.start_ts) - INTERVAL '24 hours')
  `;
  return rows[0] ? toNumber(rows[0].count_val) : 0;
}

/** Group champion: User rank=1 in any ended group. */
export async function findGroupChampionGroups(userId: number) {
  return prisma.$queryRaw<RawGroupChampionRow[]>`
    WITH ranked AS (
      SELECT
        gp.user_id,
        gp.group_id,
        RANK() OVER (
          PARTITION BY gp.group_id
          ORDER BY COALESCE(SUM(CAST(gp.points AS INTEGER)), 0) DESC,
                   COUNT(CASE WHEN gp.winning_correct_score = true THEN 1 END) DESC
        ) AS rank_val
      FROM group_predictions gp
      JOIN group_members gm ON gm.group_id = gp.group_id AND gm.user_id = gp.user_id
      WHERE gm.status = 'joined'::group_members_status
      GROUP BY gp.user_id, gp.group_id
    )
    SELECT r.group_id
    FROM ranked r
    JOIN groups g ON g.id = r.group_id
    WHERE r.user_id = ${userId}
      AND r.rank_val = 1
      AND g.status = 'ended'::group_status
  `;
}

/** H2H shared groups: Groups where both users are joined members. */
export async function findH2HSharedGroups(userId: number, opponentId: number) {
  return prisma.$queryRaw<RawH2HSharedGroupRow[]>`
    SELECT g.id AS group_id, g.name AS group_name
    FROM group_members gm1
    JOIN group_members gm2 ON gm2.group_id = gm1.group_id AND gm2.user_id = ${opponentId}
    JOIN groups g ON g.id = gm1.group_id
    WHERE gm1.user_id = ${userId}
      AND gm1.status = 'joined'::group_members_status
      AND gm2.status = 'joined'::group_members_status
  `;
}

/** Potential opponents: users who share at least one group with the given user. */
export async function findPotentialOpponents(userId: number) {
  return prisma.$queryRaw<RawPotentialOpponentRow[]>`
    SELECT DISTINCT u.id AS user_id, u.username
    FROM users u
    JOIN group_members gm ON gm.user_id = u.id
    WHERE gm.status = 'joined'::group_members_status
      AND u.id != ${userId}
      AND gm.group_id IN (
        SELECT group_id FROM group_members
        WHERE user_id = ${userId} AND status = 'joined'::group_members_status
      )
    ORDER BY u.username ASC NULLS LAST
  `;
}

/** H2H both users stats in shared groups. */
export async function findH2HUserStats(
  userId: number,
  opponentId: number,
  groupIds: number[]
) {
  if (groupIds.length === 0) return [];
  return prisma.$queryRaw<RawH2HUserStatsRow[]>`
    SELECT
      gp.user_id,
      gp.group_id,
      COALESCE(SUM(CAST(gp.points AS INTEGER)), 0) AS total_points,
      COUNT(CASE WHEN gp.winning_correct_score = true THEN 1 END)::int AS correct_score_count,
      COUNT(gp.id)::int AS prediction_count
    FROM group_predictions gp
    JOIN group_members gm ON gm.group_id = gp.group_id AND gm.user_id = gp.user_id
    WHERE gm.status = 'joined'::group_members_status
      AND gp.user_id IN (${userId}, ${opponentId})
      AND gp.group_id IN (${Prisma.join(groupIds)})
    GROUP BY gp.user_id, gp.group_id
  `;
}

/** Season stats for gamification: aggregates over group_predictions in a date range (fixture start_ts). */
export async function findSeasonStats(
  userId: number,
  season: "current" | "previous"
): Promise<{
  season_name: string;
  accuracy: number;
  exact_scores: number;
  total_predictions: number;
  points: number;
} | null> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const seasonStartMonth = 8; // August

  let startTs: number;
  let endTs: number;
  let seasonName: string;

  if (season === "current") {
    if (now.getMonth() >= seasonStartMonth - 1) {
      startTs = Math.floor(
        new Date(currentYear, seasonStartMonth - 1, 1).getTime() / 1000
      );
      endTs = Math.floor(
        new Date(currentYear + 1, seasonStartMonth - 1, 1).getTime() / 1000
      );
      seasonName = `${currentYear}/${String(currentYear + 1).slice(-2)}`;
    } else {
      startTs = Math.floor(
        new Date(currentYear - 1, seasonStartMonth - 1, 1).getTime() / 1000
      );
      endTs = Math.floor(
        new Date(currentYear, seasonStartMonth - 1, 1).getTime() / 1000
      );
      seasonName = `${currentYear - 1}/${String(currentYear).slice(-2)}`;
    }
  } else {
    if (now.getMonth() >= seasonStartMonth - 1) {
      startTs = Math.floor(
        new Date(currentYear - 1, seasonStartMonth - 1, 1).getTime() / 1000
      );
      endTs = Math.floor(
        new Date(currentYear, seasonStartMonth - 1, 1).getTime() / 1000
      );
      seasonName = `${currentYear - 1}/${String(currentYear).slice(-2)}`;
    } else {
      startTs = Math.floor(
        new Date(currentYear - 2, seasonStartMonth - 1, 1).getTime() / 1000
      );
      endTs = Math.floor(
        new Date(currentYear - 1, seasonStartMonth - 1, 1).getTime() / 1000
      );
      seasonName = `${currentYear - 2}/${String(currentYear - 1).slice(-2)}`;
    }
  }

  const rows = await prisma.$queryRaw<RawSeasonStatsRow[]>`
    SELECT
      (CASE WHEN COUNT(gp.id) = 0 THEN 0 ELSE ROUND(100.0 * (COUNT(CASE WHEN gp.winning_correct_score = true THEN 1 END) + COUNT(CASE WHEN gp.winning_match_winner = true AND gp.winning_correct_score = false THEN 1 END)) / NULLIF(COUNT(gp.id), 0))::int END) AS accuracy,
      COUNT(CASE WHEN gp.winning_correct_score = true THEN 1 END)::int AS exact_scores,
      COUNT(gp.id)::int AS total_predictions,
      COALESCE(SUM(CAST(gp.points AS INTEGER)), 0)::int AS points
    FROM group_predictions gp
    JOIN group_fixtures gf ON gf.id = gp.group_fixture_id AND gf.group_id = gp.group_id
    JOIN fixtures f ON f.id = gf.fixture_id
    LEFT JOIN group_members gm ON gm.group_id = gp.group_id AND gm.user_id = gp.user_id AND gm.status = 'joined'::group_members_status
    WHERE gp.user_id = ${userId}
      AND gp.settled_at IS NOT NULL
      AND gm.id IS NOT NULL
      AND f.start_ts >= ${startTs}
      AND f.start_ts < ${endTs}
  `;

  const row = rows[0];
  if (!row || toNumber(row.total_predictions) === 0) {
    return null;
  }

  return {
    season_name: seasonName,
    accuracy: toNumber(row.accuracy),
    exact_scores: toNumber(row.exact_scores),
    total_predictions: toNumber(row.total_predictions),
    points: toNumber(row.points),
  };
}
