// groups/scoring.ts
// Pure scoring for a single prediction vs fixture result. No DB, no side effects.
//
// Supports knockout rounds: group rules can set koRoundMode to decide which score
// period is used (FullTime = 90min, ExtraTime = after ET, Penalties = outcome only).
// For matches that don't go to ET, period scores are null and we fall back to
// the final score (homeScore/awayScore) in all modes.

export type ScoringRules = {
  predictionMode: "CorrectScore" | "MatchWinner";
  onTheNosePoints: number;
  correctDifferencePoints: number;
  outcomePoints: number;
  /** Which score period to use for KO rounds: 90min, after ET, or outcome-only (penalties). */
  koRoundMode: "FullTime" | "ExtraTime" | "Penalties";
};

/** Result of a fixture: final score plus optional period-specific scores (only set for ET/PEN matches). */
export type FixtureResult = {
  homeScore: number;
  awayScore: number;
  state: string;
  /** Score at end of 90 minutes (null for non-ET matches; SportMonks doesn't send ET breakdown for those). */
  homeScore90?: number | null;
  awayScore90?: number | null;
  /** Score at end of extra time (null if match didn't go to ET). */
  homeScoreET?: number | null;
  awayScoreET?: number | null;
  /** Penalty shootout goals only (null if no shootout). */
  penHome?: number | null;
  penAway?: number | null;
};

export type ScoringResult = {
  points: number;
  winningCorrectScore: boolean;
  winningMatchWinner: boolean;
};

const ZERO_RESULT: ScoringResult = {
  points: 0,
  winningCorrectScore: false,
  winningMatchWinner: false,
};

/** Returns the outcome (home/away/draw) from a home/away score pair. */
function getOutcome(home: number, away: number): "home" | "away" | "draw" {
  if (home > away) return "home";
  if (away > home) return "away";
  return "draw";
}

/**
 * Returns the score pair to use for scoring based on koRoundMode.
 * For matches that didn't go to ET, period fields are null and we always fall back to final score.
 *
 * - FullTime: use 90-min score if available (homeScore90/awayScore90), else final score.
 * - ExtraTime: use ET score if available (homeScoreET/awayScoreET), else final score.
 * - Penalties: use ET score for comparison (outcome only; we don't compare penalty count).
 */
function getScoreForMode(
  result: FixtureResult,
  mode: "FullTime" | "ExtraTime" | "Penalties"
): { home: number; away: number } | null {
  switch (mode) {
    case "FullTime":
      // Prefer 90-min score when available (KO matches that went to ET); otherwise final score.
      if (result.homeScore90 != null && result.awayScore90 != null) {
        return { home: result.homeScore90, away: result.awayScore90 };
      }
      return { home: result.homeScore, away: result.awayScore };

    case "ExtraTime":
      // Prefer ET score when available; otherwise final score (e.g. match decided in regular time).
      if (result.homeScoreET != null && result.awayScoreET != null) {
        return { home: result.homeScoreET, away: result.awayScoreET };
      }
      return { home: result.homeScore, away: result.awayScore };

    case "Penalties":
      // We compare outcome only; use ET score for the score-based comparison when available.
      if (result.homeScoreET != null && result.awayScoreET != null) {
        return { home: result.homeScoreET, away: result.awayScoreET };
      }
      return { home: result.homeScore, away: result.awayScore };

    default:
      return { home: result.homeScore, away: result.awayScore };
  }
}

/**
 * Determines the winner of the fixture for Penalties mode.
 * If ET scores exist and are tied, uses penalty shootout result (penHome/penAway).
 * Otherwise uses final score to decide home/away/draw.
 */
function determineWinner(result: FixtureResult): "home" | "away" | "draw" {
  // If we have ET scores and they're not tied, winner is clear from ET.
  if (result.homeScoreET != null && result.awayScoreET != null) {
    if (result.homeScoreET > result.awayScoreET) return "home";
    if (result.awayScoreET > result.homeScoreET) return "away";
    // ET tied — winner decided by penalties.
    if (result.penHome != null && result.penAway != null) {
      return result.penHome > result.penAway ? "home" : "away";
    }
  }
  // Fall back to final score (e.g. match decided in 90 min or no ET breakdown).
  if (result.homeScore > result.awayScore) return "home";
  if (result.awayScore > result.homeScore) return "away";
  return "draw";
}

/** Parses prediction string "x:y" and returns the predicted outcome (home/away/draw). */
function getPredictedWinner(prediction: { prediction: string }): "home" | "away" | "draw" {
  const parts = prediction.prediction?.trim().split(":") ?? [];
  if (parts.length !== 2) return "draw";
  const predHome = Number(parts[0]);
  const predAway = Number(parts[1]);
  if (!Number.isFinite(predHome) || !Number.isFinite(predAway)) return "draw";
  return getOutcome(predHome, predAway);
}

/**
 * Applies CorrectScore or MatchWinner scoring using the given score pair.
 * Used for FullTime and ExtraTime modes (and for non-Penalties logic).
 */
function calculateNormalScore(
  prediction: { prediction: string },
  score: { home: number; away: number },
  rules: ScoringRules
): ScoringResult {
  const parts = prediction.prediction?.trim().split(":") ?? [];
  if (parts.length !== 2) return ZERO_RESULT;

  const predHome = Number(parts[0]);
  const predAway = Number(parts[1]);
  if (!Number.isFinite(predHome) || !Number.isFinite(predAway)) return ZERO_RESULT;

  const actHome = score.home;
  const actAway = score.away;

  if (rules.predictionMode === "MatchWinner") {
    if (getOutcome(predHome, predAway) === getOutcome(actHome, actAway)) {
      return {
        points: rules.outcomePoints,
        winningCorrectScore: false,
        winningMatchWinner: true,
      };
    }
    return ZERO_RESULT;
  }

  // CorrectScore mode — tiers in order: exact, correct diff, outcome.
  if (predHome === actHome && predAway === actAway) {
    return {
      points: rules.onTheNosePoints,
      winningCorrectScore: true,
      winningMatchWinner: true,
    };
  }
  if (predHome - predAway === actHome - actAway) {
    return {
      points: rules.correctDifferencePoints,
      winningCorrectScore: false,
      winningMatchWinner: true,
    };
  }
  if (getOutcome(predHome, predAway) === getOutcome(actHome, actAway)) {
    return {
      points: rules.outcomePoints,
      winningCorrectScore: false,
      winningMatchWinner: true,
    };
  }
  return ZERO_RESULT;
}

/**
 * Calculates points for a single prediction against a fixture result and group rules.
 *
 * - Only settled when fixture state is FT.
 * - Score pair is chosen by rules.koRoundMode (FullTime / ExtraTime / Penalties);
 *   when period scores are null (e.g. match decided in 90 min), we fall back to final score.
 * - Penalties mode: only outcome matters; we award outcomePoints if predicted winner matches
 *   actual winner (using ET score, or penalty shootout when ET is tied).
 * - FullTime / ExtraTime: normal CorrectScore or MatchWinner logic on the selected score.
 */
export function calculateScore(
  prediction: { prediction: string },
  result: FixtureResult,
  rules: ScoringRules
): ScoringResult {
  if (result.state !== "FT") return ZERO_RESULT;

  const score = getScoreForMode(result, rules.koRoundMode);
  if (!score) return ZERO_RESULT;

  // Penalties mode: only award outcome points if predicted winner matches actual winner.
  if (rules.koRoundMode === "Penalties") {
    const winner = determineWinner(result);
    const predictedWinner = getPredictedWinner(prediction);
    if (winner === predictedWinner) {
      return {
        points: rules.outcomePoints,
        winningCorrectScore: false,
        winningMatchWinner: true,
      };
    }
    return ZERO_RESULT;
  }

  // FullTime and ExtraTime: normal scoring using the selected score pair.
  return calculateNormalScore(prediction, score, rules);
}
