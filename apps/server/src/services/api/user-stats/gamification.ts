// user-stats/gamification.ts
// Power score, rank tier, skills radar, streak, season comparison.

import type {
  ApiGamificationData,
  ApiGamificationResponse,
  RankTier,
  SkillRadarData,
  StreakData,
  SeasonComparisonData,
} from "@repo/types";
import * as repo from "./repository";

const RANK_THRESHOLDS: { tier: RankTier; minScore: number }[] = [
  { tier: "diamond", minScore: 85 },
  { tier: "platinum", minScore: 70 },
  { tier: "gold", minScore: 50 },
  { tier: "silver", minScore: 30 },
  { tier: "bronze", minScore: 0 },
];

function calculatePowerScore(
  accuracy: number,
  exactScoreRate: number,
  settledCount: number,
  currentStreak: number,
  bestRank: number | null
): number {
  const accuracyWeight = 0.35;
  const exactWeight = 0.25;
  const volumeWeight = 0.15;
  const streakWeight = 0.1;
  const rankWeight = 0.15;

  const accuracyScore = accuracy;
  const exactScore = Math.min(exactScoreRate * 100, 100);
  const volumeScore = Math.min((settledCount / 100) * 100, 100); // 100 predictions = max
  const streakScore = Math.min((currentStreak / 10) * 100, 100); // 10 streak = max
  const rankScore = bestRank ? Math.max(100 - (bestRank - 1) * 20, 0) : 0; // rank 1 = 100

  const powerScore =
    accuracyScore * accuracyWeight +
    exactScore * exactWeight +
    volumeScore * volumeWeight +
    streakScore * streakWeight +
    rankScore * rankWeight;

  return Math.round(powerScore);
}

function calculateRankTier(powerScore: number): {
  tier: RankTier;
  progress: number;
} {
  for (let i = 0; i < RANK_THRESHOLDS.length; i++) {
    const current = RANK_THRESHOLDS[i];
    if (current === undefined) continue;
    if (powerScore >= current.minScore) {
      const nextTier = RANK_THRESHOLDS[i - 1];
      if (!nextTier) {
        return { tier: current.tier, progress: 100 };
      }
      const range = nextTier.minScore - current.minScore;
      const progressInRange = powerScore - current.minScore;
      const progress = Math.round((progressInRange / range) * 100);
      return { tier: current.tier, progress };
    }
  }
  return { tier: "bronze", progress: 0 };
}

function calculateSkills(
  accuracy: number,
  exactScoreRate: number,
  settledCount: number,
  earlyBirdCount: number,
  varianceScore: number
): SkillRadarData {
  const timing =
    settledCount > 0
      ? Math.min(Math.round((earlyBirdCount / settledCount) * 100) || 0, 100)
      : 0;
  return {
    accuracy: Math.min(accuracy, 100),
    consistency: Math.max(100 - varianceScore, 0),
    volume: Math.min(Math.round((settledCount / 200) * 100), 100),
    exactScore: Math.min(Math.round(exactScoreRate * 100), 100),
    timing,
  };
}

export async function getGamificationData(
  userId: number
): Promise<ApiGamificationResponse> {
  const [
    overall,
    streakRows,
    streakRowsDesc,
    earlyCount,
    bestRank,
    currentSeasonStats,
    previousSeasonStats,
  ] = await Promise.all([
    repo.findOverallStats(userId),
    repo.findStreakData(userId),
    repo.findStreakDataDesc(userId),
    repo.findEarlyBirdCount(userId),
    repo.findBestRank(userId),
    repo.findSeasonStats(userId, "current"),
    repo.findSeasonStats(userId, "previous"),
  ]);

  if (!overall) {
    return {
      status: "success",
      data: getEmptyGamificationData(),
      message: "No data available",
    };
  }

  const settledCount = repo.toNumber(overall.settled_count);
  const exactScores = repo.toNumber(overall.correct_score_count);
  const correctOutcomeCount = repo.toNumber(overall.correct_outcome_count);
  const accuracy =
    settledCount > 0
      ? Math.round(((exactScores + correctOutcomeCount) / settledCount) * 100)
      : 0;
  const exactScoreRate = settledCount > 0 ? exactScores / settledCount : 0;

  const streakPointsDesc = streakRowsDesc.map((r) => repo.toNumber(r.points));
  let currentStreak = 0;
  for (const pts of streakPointsDesc) {
    if (pts > 0) currentStreak++;
    else break;
  }

  const streakPoints = streakRows.map((r) => repo.toNumber(r.points));
  let bestStreak = 0;
  let tempStreak = 0;
  for (const pts of streakPoints) {
    if (pts > 0) {
      tempStreak++;
      bestStreak = Math.max(bestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  const lastResults: ("hit" | "miss")[] = streakPointsDesc
    .slice(0, 10)
    .map((pts) => (pts > 0 ? "hit" : "miss"));

  const powerScore = calculatePowerScore(
    accuracy,
    exactScoreRate,
    settledCount,
    currentStreak,
    bestRank
  );

  const { tier, progress } = calculateRankTier(powerScore);

  const varianceScore = 30; // placeholder; TODO: compute from prediction points variance
  const skills = calculateSkills(
    accuracy,
    exactScoreRate,
    settledCount,
    earlyCount,
    varianceScore
  );

  const streak: StreakData = {
    current: currentStreak,
    best: bestStreak,
    lastResults,
  };

  const seasonComparison: SeasonComparisonData = {
    currentSeason: {
      name: currentSeasonStats?.season_name ?? "2024/25",
      accuracy: currentSeasonStats?.accuracy ?? 0,
      exactScores: currentSeasonStats?.exact_scores ?? 0,
      totalPredictions: currentSeasonStats?.total_predictions ?? 0,
      points: currentSeasonStats?.points ?? 0,
    },
    previousSeason: previousSeasonStats
      ? {
          name: previousSeasonStats.season_name,
          accuracy: previousSeasonStats.accuracy,
          exactScores: previousSeasonStats.exact_scores,
          totalPredictions: previousSeasonStats.total_predictions,
          points: previousSeasonStats.points,
        }
      : null,
  };

  const data: ApiGamificationData = {
    powerScore,
    rankTier: tier,
    rankProgress: progress,
    skills,
    streak,
    seasonComparison,
  };

  return {
    status: "success",
    data,
    message: "Gamification data fetched successfully",
  };
}

function getEmptyGamificationData(): ApiGamificationData {
  return {
    powerScore: 0,
    rankTier: "bronze",
    rankProgress: 0,
    skills: {
      accuracy: 0,
      consistency: 0,
      volume: 0,
      exactScore: 0,
      timing: 0,
    },
    streak: {
      current: 0,
      best: 0,
      lastResults: [],
    },
    seasonComparison: {
      currentSeason: {
        name: "2024/25",
        accuracy: 0,
        exactScores: 0,
        totalPredictions: 0,
        points: 0,
      },
      previousSeason: null,
    },
  };
}
