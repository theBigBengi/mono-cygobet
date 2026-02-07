// user-stats/insights.ts
// Generate profile insights from stats (streak, ranking, league, badges, groups won).

import type { ApiInsight, ApiBadge } from "@repo/types";

export interface InsightsInput {
  currentStreak: number;
  bestStreak: number;
  percentile: number;
  bestLeague: { leagueName: string; accuracy: number } | null;
  accuracy: number;
  exactScores: number;
  groupsWon: number;
  badges: ApiBadge[];
}

export function generateInsights(input: InsightsInput): ApiInsight[] {
  const insights: ApiInsight[] = [];

  if (input.currentStreak >= 3) {
    insights.push({
      type: "streak",
      icon: "🔥",
      text: `You're on a ${input.currentStreak}-game winning streak!`,
      textHe: `אתה ברצף של ${input.currentStreak} ניחושים נכונים!`,
    });
  }

  if (input.percentile <= 10) {
    insights.push({
      type: "ranking",
      icon: "🏆",
      text: `Top ${input.percentile}% of all predictors`,
      textHe: `בין ${input.percentile}% המנחשים הטובים`,
    });
  } else if (input.percentile <= 25) {
    insights.push({
      type: "ranking",
      icon: "📈",
      text: `Top ${input.percentile}% of all predictors`,
      textHe: `בין ${input.percentile}% המנחשים הטובים`,
    });
  }

  if (input.bestLeague && input.bestLeague.accuracy >= 50) {
    insights.push({
      type: "league",
      icon: "🎯",
      text: `Best league: ${input.bestLeague.leagueName} (${input.bestLeague.accuracy}%)`,
      textHe: `הליגה הטובה שלך: ${input.bestLeague.leagueName} (${input.bestLeague.accuracy}%)`,
    });
  }

  const nearBadge = input.badges.find(
    (b) => !b.earned && b.progress >= 60 && b.progress < 100
  );
  if (nearBadge) {
    const remaining = Math.ceil((100 - nearBadge.progress) / 20);
    insights.push({
      type: "milestone",
      icon: "⭐",
      text: `Almost there! ${remaining} more to unlock ${nearBadge.name}`,
      textHe: `כמעט! עוד ${remaining} לפתיחת ${nearBadge.name}`,
    });
  }

  if (input.groupsWon >= 2) {
    insights.push({
      type: "ranking",
      icon: "👑",
      text: `Champion of ${input.groupsWon} groups`,
      textHe: `אלוף של ${input.groupsWon} קבוצות`,
    });
  }

  return insights.slice(0, 3);
}
