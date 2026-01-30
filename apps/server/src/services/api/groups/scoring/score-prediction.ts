/**
 * Pure scoring logic for predictions.
 *
 * No DB, no time, no external context. Same input → same output.
 * Used by the Settlement service to compute points for closed fixtures.
 */

export type PredictionScore = { home: number; away: number };
export type ScoringRules = {
  onTheNosePoints: number;
  correctDifferencePoints: number;
  outcomePoints: number;
};

export type ScoreResult = {
  points: number;
  exactResult: boolean;
  correctWinnerOrDraw: boolean;
};

/**
 * Outcome of a match: home win, away win, or draw.
 */
function getOutcome(score: PredictionScore): "home" | "away" | "draw" {
  if (score.home > score.away) return "home";
  if (score.away > score.home) return "away";
  return "draw";
}

/**
 * Goal difference (home - away). Used to compare prediction vs result.
 */
function goalDifference(score: PredictionScore): number {
  return score.home - score.away;
}

/**
 * Compute points and flags for a single prediction against a result.
 *
 * Hierarchy (only one applies):
 * 1. Exact result → onTheNosePoints, exactResult: true, correctWinnerOrDraw: true
 * 2. Correct goal difference (but not exact) → correctDifferencePoints, exactResult: false, correctWinnerOrDraw: true
 * 3. Correct winner/draw (but not goal diff) → outcomePoints, exactResult: false, correctWinnerOrDraw: true
 * 4. Otherwise → 0, exactResult: false, correctWinnerOrDraw: false
 */
export function scorePrediction(
  prediction: PredictionScore,
  result: PredictionScore,
  rules: ScoringRules
): ScoreResult {
  const exact =
    prediction.home === result.home && prediction.away === result.away;
  const predOutcome = getOutcome(prediction);
  const resultOutcome = getOutcome(result);
  const correctOutcome = predOutcome === resultOutcome;
  const predDiff = goalDifference(prediction);
  const resultDiff = goalDifference(result);
  const correctDiff = predDiff === resultDiff;

  if (exact) {
    return {
      points: rules.onTheNosePoints,
      exactResult: true,
      correctWinnerOrDraw: true,
    };
  }
  if (correctDiff) {
    return {
      points: rules.correctDifferencePoints,
      exactResult: false,
      correctWinnerOrDraw: true,
    };
  }
  if (correctOutcome) {
    return {
      points: rules.outcomePoints,
      exactResult: false,
      correctWinnerOrDraw: true,
    };
  }
  return {
    points: 0,
    exactResult: false,
    correctWinnerOrDraw: false,
  };
}
