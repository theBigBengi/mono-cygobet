import { Share } from "react-native";

/**
 * Open native share sheet with plain text.
 */
export async function shareText(message: string): Promise<void> {
  await Share.share({ message });
}

export type RankingShareParams = {
  username: string;
  rank: number;
  totalPoints: number;
  groupName: string;
};

/**
 * Build share text for ranking position.
 */
export function buildRankingShareText(params: RankingShareParams): string {
  return `I'm ranked #${params.rank} with ${params.totalPoints} points in "${params.groupName}"! 🏆`;
}

export type PredictionShareParams = {
  fixtureName: string;
  prediction: string;
  actual: string;
  points: number;
  groupName: string;
};

/**
 * Build share text for a settled prediction result.
 */
export function buildPredictionShareText(params: PredictionShareParams): string {
  return `${params.fixtureName}\nMy prediction: ${params.prediction}\nResult: ${params.actual}\nPoints earned: ${params.points} ⚽`;
}
