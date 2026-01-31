// user-stats/badges.ts
// Pure functions computing 6 badges from raw data.

import type { ApiBadge, ApiBadgeId } from "@repo/types";

export type BadgeInputs = {
  exactScores: number;
  underdogWins: number;
  maxStreak: number;
  isGroupChampion: boolean;
  accuracy: number;
  settledCount: number;
  earlyCount: number;
};

const BADGE_DEFINITIONS: Record<
  ApiBadgeId,
  { name: string; description: string }
> = {
  sharpshooter: {
    name: "Sharpshooter",
    description: "5+ exact score predictions",
  },
  underdog_caller: {
    name: "Underdog Caller",
    description: "3+ correct underdog predictions",
  },
  streak_master: {
    name: "Streak Master",
    description: "5+ consecutive scoring predictions",
  },
  group_champion: {
    name: "Group Champion",
    description: "Rank #1 in any ended group",
  },
  consistency_king: {
    name: "Consistency King",
    description: "70%+ accuracy over 20+ predictions",
  },
  early_bird: {
    name: "Early Bird",
    description: "10+ predictions placed 24h before kickoff",
  },
};

function computeSharpshooter(exactScores: number): ApiBadge {
  const threshold = 5;
  const earned = exactScores >= threshold;
  const progress = Math.min(100, (exactScores / threshold) * 100);
  return {
    id: "sharpshooter",
    name: BADGE_DEFINITIONS.sharpshooter.name,
    description: BADGE_DEFINITIONS.sharpshooter.description,
    earned,
    progress: Math.round(progress),
  };
}

function computeUnderdogCaller(underdogWins: number): ApiBadge {
  const threshold = 3;
  const earned = underdogWins >= threshold;
  const progress = Math.min(100, (underdogWins / threshold) * 100);
  return {
    id: "underdog_caller",
    name: BADGE_DEFINITIONS.underdog_caller.name,
    description: BADGE_DEFINITIONS.underdog_caller.description,
    earned,
    progress: Math.round(progress),
  };
}

function computeStreakMaster(maxStreak: number): ApiBadge {
  const threshold = 5;
  const earned = maxStreak >= threshold;
  const progress = Math.min(100, (maxStreak / threshold) * 100);
  return {
    id: "streak_master",
    name: BADGE_DEFINITIONS.streak_master.name,
    description: BADGE_DEFINITIONS.streak_master.description,
    earned,
    progress: Math.round(progress),
  };
}

function computeGroupChampion(isGroupChampion: boolean): ApiBadge {
  return {
    id: "group_champion",
    name: BADGE_DEFINITIONS.group_champion.name,
    description: BADGE_DEFINITIONS.group_champion.description,
    earned: isGroupChampion,
    progress: isGroupChampion ? 100 : 0,
  };
}

function computeConsistencyKing(
  accuracy: number,
  settledCount: number
): ApiBadge {
  const threshold = 70;
  const minPredictions = 20;
  const eligible = settledCount >= minPredictions;
  const earned = eligible && accuracy >= threshold;
  const progress = eligible ? Math.min(100, (accuracy / threshold) * 100) : 0;
  return {
    id: "consistency_king",
    name: BADGE_DEFINITIONS.consistency_king.name,
    description: BADGE_DEFINITIONS.consistency_king.description,
    earned,
    progress: Math.round(progress),
  };
}

function computeEarlyBird(earlyCount: number): ApiBadge {
  const threshold = 10;
  const earned = earlyCount >= threshold;
  const progress = Math.min(100, (earlyCount / threshold) * 100);
  return {
    id: "early_bird",
    name: BADGE_DEFINITIONS.early_bird.name,
    description: BADGE_DEFINITIONS.early_bird.description,
    earned,
    progress: Math.round(progress),
  };
}

/**
 * Compute all 6 badges from raw stats inputs.
 */
export function computeBadges(inputs: BadgeInputs): ApiBadge[] {
  return [
    computeSharpshooter(inputs.exactScores),
    computeUnderdogCaller(inputs.underdogWins),
    computeStreakMaster(inputs.maxStreak),
    computeGroupChampion(inputs.isGroupChampion),
    computeConsistencyKing(inputs.accuracy, inputs.settledCount),
    computeEarlyBird(inputs.earlyCount),
  ];
}

/**
 * Compute max consecutive scoring streak from ordered points (by settled_at ASC).
 */
export function computeMaxStreak(pointsPerSettled: number[]): number {
  let max = 0;
  let current = 0;
  for (const pts of pointsPerSettled) {
    if (pts > 0) {
      current++;
      max = Math.max(max, current);
    } else {
      current = 0;
    }
  }
  return max;
}
