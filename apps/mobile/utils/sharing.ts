import { Share } from "react-native";
import i18n from "i18next";

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
  return i18n.t("share.ranking", {
    ns: "common",
    rank: params.rank,
    points: params.totalPoints,
    group: params.groupName,
    defaultValue: `I'm ranked #${params.rank} with ${params.totalPoints} points in "${params.groupName}"!`,
  });
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
  return i18n.t("share.prediction", {
    ns: "common",
    fixture: params.fixtureName,
    prediction: params.prediction,
    actual: params.actual,
    points: params.points,
    defaultValue: `${params.fixtureName}\nMy prediction: ${params.prediction}\nResult: ${params.actual}\nPoints earned: ${params.points}`,
  });
}
