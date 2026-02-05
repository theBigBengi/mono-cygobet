/**
 * Shared utilities for the predictions feature: card position in a group,
 * content padding (header + optional filter tabs), and prediction formatting for share.
 */
import type { PositionInGroup } from "@/types/common";
import { HEADER_HEIGHT, FILTER_TABS_HEIGHT } from "./constants";

/**
 * Determines the position of a card within a group of cards.
 * Used for styling cards that appear together (rounded corners, borders, etc.)
 *
 * @param index - The index of the current card in the group
 * @param totalCount - The total number of cards in the group
 * @returns The position: "single" if only one card, "top" if first, "bottom" if last, "middle" otherwise
 */
export function getPositionInGroup(
  index: number,
  totalCount: number
): PositionInGroup {
  if (totalCount === 1) {
    return "single";
  }

  if (index === 0) {
    return "top";
  }

  if (index === totalCount - 1) {
    return "bottom";
  }

  return "middle";
}

/** Params for computing ScrollView content top padding (header + optional filter bar). */
interface CalculateContentPaddingTopParams {
  headerHeight: number;
  hasFilters: boolean;
  filterTabsHeight: number;
}

/**
 * Calculates the top padding for the ScrollView content container.
 * Accounts for the header overlay and optional filter tabs.
 *
 * @param params - Configuration object
 * @param params.headerHeight - Height of the header overlay
 * @param params.hasFilters - Whether filter tabs are visible
 * @param params.filterTabsHeight - Height of filter tabs when visible
 * @returns The calculated padding top value
 */
export function calculateContentPaddingTop({
  headerHeight,
  hasFilters,
  filterTabsHeight,
}: CalculateContentPaddingTopParams): number {
  return headerHeight + (hasFilters ? filterTabsHeight : 0);
}

/**
 * Convenience: content padding top using HEADER_HEIGHT and FILTER_TABS_HEIGHT from constants.
 */
export function calculateContentPaddingTopDefault(hasFilters: boolean): number {
  return calculateContentPaddingTop({
    headerHeight: HEADER_HEIGHT,
    hasFilters,
    filterTabsHeight: FILTER_TABS_HEIGHT,
  });
}

/**
 * Formats a prediction (home/away scores) as a short display string for sharing.
 * - MatchWinner: "1" (home win), "X" (draw), "2" (away win).
 * - CorrectScore: "home-away" (e.g. "2-1").
 */
export function formatPredictionForShare(
  prediction: { home: number | null; away: number | null },
  predictionMode: "CorrectScore" | "MatchWinner"
): string {
  if (predictionMode === "MatchWinner") {
    if (prediction.home === prediction.away) return "X";
    return (prediction.home ?? 0) > (prediction.away ?? 0) ? "1" : "2";
  }
  return `${prediction.home}-${prediction.away}`;
}
