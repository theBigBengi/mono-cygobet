/** Rank tiers from lowest to highest */
export type RankTier = "bronze" | "silver" | "gold" | "platinum" | "diamond";

/** Skill categories for radar chart */
export interface SkillRadarData {
  accuracy: number; // 0-100: based on overall accuracy
  consistency: number; // 0-100: low variance in predictions
  volume: number; // 0-100: number of predictions made
  exactScore: number; // 0-100: exact score percentage
  timing: number; // 0-100: early bird predictions
}

/** Current streak information */
export interface StreakData {
  current: number; // current consecutive scoring predictions
  best: number; // all-time best streak
  lastResults: ("hit" | "miss")[]; // last 10 results for visualization
}

/** Season comparison data */
export interface SeasonComparisonData {
  currentSeason: {
    name: string; // e.g., "2024/25"
    accuracy: number;
    exactScores: number;
    totalPredictions: number;
    points: number;
  };
  previousSeason: {
    name: string; // e.g., "2023/24"
    accuracy: number;
    exactScores: number;
    totalPredictions: number;
    points: number;
  } | null;
}

/** Complete gamification data */
export interface ApiGamificationData {
  powerScore: number; // 0-100
  rankTier: RankTier;
  rankProgress: number; // 0-100 progress to next tier
  skills: SkillRadarData;
  streak: StreakData;
  seasonComparison: SeasonComparisonData;
}

/** API Response */
export interface ApiGamificationResponse {
  status: "success" | "error";
  data: ApiGamificationData;
  message: string;
}
