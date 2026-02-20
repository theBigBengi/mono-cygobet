// user-stats/service.ts
// Orchestration: getUserStats, getHeadToHead. Follows ranking.ts pattern.

import type {
  ApiUserStatsResponse,
  ApiUserStatsData,
  ApiHeadToHeadResponse,
  ApiHeadToHeadData,
  ApiFormItem,
  ApiUserGroupStat,
  ApiPredictionDistribution,
} from "@repo/types";
import * as repo from "./repository";
import { computeBadges, computeMaxStreak } from "./badges";
import { generateInsights } from "./insights";
import { getCache } from "../../../lib/cache";

const statsCache = getCache("user-stats");
const h2hCache = getCache("h2h");

/**
 * Derive form result from prediction flags and points.
 */
function toFormResult(
  points: number,
  winningCorrectScore: boolean,
  winningMatchWinner: boolean
): "exact" | "difference" | "outcome" | "miss" {
  if (points === 0) return "miss";
  if (winningCorrectScore) return "exact";
  if (winningMatchWinner) {
    return points >= 2 ? "difference" : "outcome";
  }
  return "miss";
}

/**
 * Compute user stats from database (expensive — 14 parallel queries).
 */
async function computeUserStats(
  targetUserId: number
): Promise<ApiUserStatsResponse> {
  const [
    overall,
    perGroup,
    ranks,
    distribution,
    recentForm,
    sparkline,
    streakRows,
    streakRowsDesc,
    underdogCount,
    earlyCount,
    championGroups,
    bestRank,
    percentile,
    bestLeague,
  ] = await Promise.all([
    repo.findOverallStats(targetUserId),
    repo.findPerGroupStats(targetUserId),
    repo.findRanksPerGroup(targetUserId),
    repo.findDistribution(targetUserId),
    repo.findRecentForm(targetUserId),
    repo.findSparklineData(targetUserId),
    repo.findStreakData(targetUserId),
    repo.findStreakDataDesc(targetUserId),
    repo.findUnderdogWinsCount(targetUserId),
    repo.findEarlyBirdCount(targetUserId),
    repo.findGroupChampionGroups(targetUserId),
    repo.findBestRank(targetUserId),
    repo.findPercentile(targetUserId),
    repo.findBestLeague(targetUserId),
  ]);

  if (!overall) {
    const emptyBadges = computeBadges({
      exactScores: 0,
      underdogWins: 0,
      maxStreak: 0,
      isGroupChampion: false,
      accuracy: 0,
      settledCount: 0,
      earlyCount: 0,
    });
    return {
      status: "success",
      data: {
        user: {
          id: targetUserId,
          username: null,
          image: null,
        },
        overall: {
          totalPoints: 0,
          totalPredictions: 0,
          settledPredictions: 0,
          exactScores: 0,
          accuracy: 0,
          groupsPlayed: 0,
          bestRank: null,
          currentStreak: 0,
          bestStreak: 0,
          percentile: 0,
        },
        distribution: { exact: 0, difference: 0, outcome: 0, miss: 0 },
        form: [],
        badges: emptyBadges,
        groups: [],
        insights: generateInsights({
          currentStreak: 0,
          bestStreak: 0,
          percentile: 0,
          bestLeague: null,
          accuracy: 0,
          exactScores: 0,
          groupsWon: 0,
          badges: emptyBadges,
        }),
        bestLeague: null,
      },
      message: "User stats fetched successfully",
    };
  }

  const totalPoints = repo.toNumber(overall.total_points);
  const settledCount = repo.toNumber(overall.settled_count);
  const exactScores = repo.toNumber(overall.correct_score_count);
  const correctOutcomeCount = repo.toNumber(overall.correct_outcome_count);
  const accuracy =
    settledCount > 0
      ? Math.round(((exactScores + correctOutcomeCount) / settledCount) * 100)
      : 0;

  const rankByGroup = new Map(
    ranks.map((r) => [r.group_id, repo.toNumber(r.rank_val)])
  );

  const sparklineByGroup = new Map<number, number[]>();
  for (const row of sparkline) {
    const pts = repo.toNumber(row.points);
    const arr = sparklineByGroup.get(row.group_id) ?? [];
    arr.push(pts);
    sparklineByGroup.set(row.group_id, arr);
  }

  const streakPoints = streakRows.map((r) => repo.toNumber(r.points));
  const maxStreak = computeMaxStreak(streakPoints);
  const streakPointsDesc = streakRowsDesc.map((r) => repo.toNumber(r.points));
  let currentStreak = 0;
  for (const pts of streakPointsDesc) {
    if (pts > 0) currentStreak++;
    else break;
  }

  const form: ApiFormItem[] = recentForm.map((row) => ({
    fixtureId: row.fixture_id,
    points: repo.toNumber(row.points),
    result: toFormResult(
      repo.toNumber(row.points),
      row.winning_correct_score,
      row.winning_match_winner
    ),
  }));

  const groups: ApiUserGroupStat[] = perGroup.map((row) => {
    const pts = repo.toNumber(row.total_points);
    const predCount = repo.toNumber(row.prediction_count);
    const settledCount = repo.toNumber(row.settled_count);
    const exactCount = repo.toNumber(row.correct_score_count);
    const outcomeCount = repo.toNumber(row.correct_outcome_count);
    const groupAccuracy =
      settledCount > 0
        ? Math.round(((exactCount + outcomeCount) / settledCount) * 100)
        : 0;
    return {
      groupId: row.group_id,
      groupName: row.group_name,
      groupStatus: row.group_status,
      rank: rankByGroup.get(row.group_id) ?? 0,
      totalPoints: pts,
      predictionCount: predCount,
      correctScoreCount: exactCount,
      accuracy: groupAccuracy,
      recentPoints: sparklineByGroup.get(row.group_id) ?? [],
    };
  });

  const dist: ApiPredictionDistribution = {
    exact: repo.toNumber(distribution.exact_count),
    difference: repo.toNumber(distribution.difference_count),
    outcome: repo.toNumber(distribution.outcome_count),
    miss: repo.toNumber(distribution.miss_count),
  };

  const badges = computeBadges({
    exactScores,
    underdogWins: underdogCount,
    maxStreak,
    isGroupChampion: championGroups.length > 0,
    accuracy,
    settledCount,
    earlyCount,
  });

  const groupsWon = groups.filter(
    (g) => g.rank === 1 && g.groupStatus === "ended"
  ).length;

  const data: ApiUserStatsData = {
    user: {
      id: overall.user_id,
      username: overall.username,
      image: overall.image,
    },
    overall: {
      totalPoints,
      totalPredictions: repo.toNumber(overall.prediction_count),
      settledPredictions: settledCount,
      exactScores,
      accuracy,
      groupsPlayed: perGroup.length,
      bestRank,
      currentStreak,
      bestStreak: maxStreak,
      percentile,
    },
    distribution: dist,
    form,
    badges,
    groups,
    insights: generateInsights({
      currentStreak,
      bestStreak: maxStreak,
      percentile,
      bestLeague,
      accuracy,
      exactScores,
      groupsWon,
      badges,
    }),
    bestLeague,
  };

  return {
    status: "success",
    data,
    message: "User stats fetched successfully",
  };
}

/**
 * Get user stats — cached for 5 minutes when Redis is available.
 */
export async function getUserStats(
  targetUserId: number
): Promise<ApiUserStatsResponse> {
  if (statsCache) {
    return statsCache.getOrSet(
      String(targetUserId),
      300,
      () => computeUserStats(targetUserId)
    );
  }
  return computeUserStats(targetUserId);
}

/**
 * Compute head-to-head comparison from database.
 */
async function computeHeadToHead(
  userId: number,
  opponentId: number
): Promise<ApiHeadToHeadResponse> {
  const [sharedGroups, userInfo, opponentInfo] = await Promise.all([
    repo.findH2HSharedGroups(userId, opponentId),
    repo.findOverallStats(userId),
    repo.findOverallStats(opponentId),
  ]);

  const groupIds = sharedGroups.map((g) => g.group_id);
  const statsRows =
    groupIds.length > 0
      ? await repo.findH2HUserStats(userId, opponentId, groupIds)
      : [];

  const userStatsByGroup = new Map<
    number,
    { points: number; exact: number; count: number }
  >();
  const opponentStatsByGroup = new Map<
    number,
    { points: number; exact: number; count: number }
  >();

  for (const row of statsRows) {
    const pts = repo.toNumber(row.total_points);
    const exact = repo.toNumber(row.correct_score_count);
    const count = repo.toNumber(row.prediction_count);
    if (row.user_id === userId) {
      userStatsByGroup.set(row.group_id, { points: pts, exact, count });
    } else {
      opponentStatsByGroup.set(row.group_id, { points: pts, exact, count });
    }
  }

  let userTotal = 0;
  let opponentTotal = 0;
  let userExact = 0;
  let opponentExact = 0;
  let userWins = 0;
  let opponentWins = 0;
  let ties = 0;

  const sharedGroupsData = sharedGroups.map((g) => {
    const u = userStatsByGroup.get(g.group_id) ?? {
      points: 0,
      exact: 0,
      count: 0,
    };
    const o = opponentStatsByGroup.get(g.group_id) ?? {
      points: 0,
      exact: 0,
      count: 0,
    };
    userTotal += u.points;
    opponentTotal += o.points;
    userExact += u.exact;
    opponentExact += o.exact;
    if (u.points > o.points) userWins++;
    else if (o.points > u.points) opponentWins++;
    else ties++;

    return {
      groupId: g.group_id,
      groupName: g.group_name,
      userRank: 0,
      userPoints: u.points,
      opponentRank: 0,
      opponentPoints: o.points,
    };
  });

  const [userRanks, oppRanks] = await Promise.all([
    repo.findRanksPerGroup(userId),
    repo.findRanksPerGroup(opponentId),
  ]);
  const userRankByGroup = new Map(
    userRanks.map((r) => [r.group_id, repo.toNumber(r.rank_val)])
  );
  const oppRankByGroup = new Map(
    oppRanks.map((r) => [r.group_id, repo.toNumber(r.rank_val)])
  );

  const rankMap = new Map(
    groupIds.map((gid) => [
      gid,
      {
        userRank: userRankByGroup.get(gid) ?? 0,
        oppRank: oppRankByGroup.get(gid) ?? 0,
      },
    ])
  );

  const sharedWithRanks = sharedGroupsData.map((item) => {
    const r = rankMap.get(item.groupId);
    return {
      ...item,
      userRank: r?.userRank ?? item.userRank,
      opponentRank: r?.oppRank ?? item.opponentRank,
    };
  });

  const userSettled = userInfo ? repo.toNumber(userInfo.settled_count) : 0;
  const opponentSettled = opponentInfo
    ? repo.toNumber(opponentInfo.settled_count)
    : 0;
  const userAccuracy =
    userSettled > 0 && userInfo
      ? Math.round(
          ((repo.toNumber(userInfo.correct_score_count) +
            repo.toNumber(userInfo.correct_outcome_count)) /
            userSettled) *
            100
        )
      : 0;
  const opponentAccuracy =
    opponentSettled > 0 && opponentInfo
      ? Math.round(
          ((repo.toNumber(opponentInfo.correct_score_count) +
            repo.toNumber(opponentInfo.correct_outcome_count)) /
            opponentSettled) *
            100
        )
      : 0;

  const data: ApiHeadToHeadData = {
    user: {
      id: userId,
      username: userInfo?.username ?? null,
    },
    opponent: {
      id: opponentId,
      username: opponentInfo?.username ?? null,
    },
    sharedGroups: sharedWithRanks,
    summary: {
      userTotalPoints: userTotal,
      opponentTotalPoints: opponentTotal,
      userExactScores: userExact,
      opponentExactScores: opponentExact,
      userAccuracy,
      opponentAccuracy,
      userWins,
      opponentWins,
      ties,
    },
  };

  return {
    status: "success",
    data,
    message: "Head-to-head fetched successfully",
  };
}

/**
 * Get head-to-head comparison — cached for 5 minutes when Redis is available.
 * Cache key uses canonical ordering (min:max) so A-vs-B and B-vs-A share a key.
 */
export async function getHeadToHead(
  userId: number,
  opponentId: number
): Promise<ApiHeadToHeadResponse> {
  if (h2hCache) {
    const key = `${Math.min(userId, opponentId)}:${Math.max(userId, opponentId)}`;
    return h2hCache.getOrSet(key, 300, () =>
      computeHeadToHead(userId, opponentId)
    );
  }
  return computeHeadToHead(userId, opponentId);
}

/**
 * Get list of potential H2H opponents (users who share at least one group).
 */
export async function getH2HOpponents(userId: number) {
  const rows = await repo.findPotentialOpponents(userId);
  return {
    status: "success" as const,
    data: {
      opponents: rows.map((r) => ({
        id: r.user_id,
        username: r.username,
      })),
    },
    message: "Opponents fetched successfully",
  };
}
