import {
  isEditable as isEditableState,
  isLive as isLiveState,
  isFinished as isFinishedState,
  isCancelled as isCancelledState,
} from "@repo/utils";
import { formatKickoffTime } from "@/utils/fixture";
import type { FixtureItem } from "@/types/common";
import type { PositionInGroup } from "@/types/common";
import { FIXTURE_STATE_MAP, CARD_BORDER_RADIUS } from "./constants";

export type GameResultOrTime = {
  home: string | null;
  away: string | null;
  time: string | null;
} | null;

/**
 * Format live display string from state and optional live minute (e.g. "67'", "HT", "PEN").
 */
export function formatLiveDisplay(
  state: string,
  liveMinute: number | null | undefined
): string {
  switch (state) {
    case "HT":
      return "HT";
    case "BREAK":
      return "BRK";
    case "EXTRA_TIME_BREAK":
      return "ET BRK";
    case "PEN_BREAK":
      return "PEN BRK";
    case "INPLAY_PENALTIES":
      return "PEN";
    case "INPLAY_1ST_HALF":
    case "INPLAY_2ND_HALF":
    case "INPLAY_ET":
      return liveMinute != null ? `${liveMinute}'` : "LIVE";
    default:
      return liveMinute != null ? `${liveMinute}'` : "LIVE";
  }
}

/**
 * Get game result scores or kickoff time based on fixture state
 */
export function getGameResultOrTime(fixture: FixtureItem): GameResultOrTime {
  const isLive = isLiveState(fixture.state);
  const isFinished = isFinishedState(fixture.state);
  const isEditable = isEditableState(fixture.state);
  const isCancelled = isCancelledState(fixture.state);

  if ((isLive || isFinished) && fixture.result) {
    const resultParts = fixture.result.replace(":", "-").split("-");
    if (resultParts.length === 2) {
      return {
        home: resultParts[0].trim(),
        away: resultParts[1].trim(),
        time: null,
      };
    }
  }

  if (isCancelled) {
    const statusText = FIXTURE_STATE_MAP[fixture.state] || `Status: ${fixture.state}`;
    return { home: statusText, away: null, time: null };
  }

  // For games that haven't started, show kickoff time
  if (isEditable) {
    const kickoffTime = formatKickoffTime(fixture.kickoffAt || null);
    return { home: null, away: null, time: kickoffTime };
  }

  // Live game without result yet: show minute or status (e.g. 67', HT, PEN)
  if (isLive) {
    const timeStr = formatLiveDisplay(fixture.state, fixture.liveMinute ?? null);
    return { home: null, away: null, time: timeStr };
  }

  return null;
}

/**
 * Get points from fixture prediction data (from server)
 * Points are shown once in the middle, not per team
 */
export function getFixturePoints(fixture: FixtureItem): number | null {
  if (fixture.prediction && fixture.prediction.points !== undefined && fixture.prediction.points !== null) {
    const pointsValue = fixture.prediction.points;
    const parsed = typeof pointsValue === "number" ? pointsValue : parseInt(String(pointsValue), 10);
    // Return 0 if it's a valid number (including 0), otherwise null
    return !isNaN(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Determine winner when game is finished
 */
export function getFixtureWinner(
  isFinished: boolean,
  gameResultOrTime: GameResultOrTime
): "home" | "away" | "draw" | null {
  if (!isFinished || !gameResultOrTime?.home || !gameResultOrTime?.away) {
    return null;
  }

  const homeScore = parseInt(gameResultOrTime.home, 10);
  const awayScore = parseInt(gameResultOrTime.away, 10);

  if (isNaN(homeScore) || isNaN(awayScore)) {
    return null;
  }

  if (homeScore > awayScore) return "home";
  if (awayScore > homeScore) return "away";
  return "draw";
}

/**
 * Get card border radius style based on position in group
 */
export function getCardBorderRadius(positionInGroup: PositionInGroup) {
  if (positionInGroup === "single") {
    return { borderRadius: CARD_BORDER_RADIUS };
  }

  if (positionInGroup === "top") {
    return {
      borderTopLeftRadius: CARD_BORDER_RADIUS,
      borderTopRightRadius: CARD_BORDER_RADIUS,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    };
  }

  if (positionInGroup === "bottom") {
    return {
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      borderBottomLeftRadius: CARD_BORDER_RADIUS,
      borderBottomRightRadius: CARD_BORDER_RADIUS,
    };
  }

  return { borderRadius: 0 };
}

/**
 * Get card border style based on position in group
 */
export function getCardBorderStyle(positionInGroup: PositionInGroup) {
  if (positionInGroup === "middle" || positionInGroup === "bottom") {
    return { borderTopWidth: 0 };
  }
  return {};
}

/**
 * Convert prediction value to display string
 */
export function toDisplay(value: number | null, isFinished: boolean = false): string {
  if (value === null) {
    return isFinished ? "-" : "";
  }
  return String(value);
}
