// groups/scoring.ts
// Pure scoring for a single prediction vs fixture result. No DB, no side effects.

export type ScoringRules = {
  predictionMode: "CorrectScore" | "MatchWinner";
  onTheNosePoints: number;
  correctDifferencePoints: number;
  outcomePoints: number;
};

export type FixtureResult = {
  homeScore: number;
  awayScore: number;
  state: string;
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

function getOutcome(home: number, away: number): "home" | "away" | "draw" {
  if (home > away) return "home";
  if (away > home) return "away";
  return "draw";
}

export function calculateScore(
  prediction: { prediction: string },
  result: FixtureResult,
  rules: ScoringRules
): ScoringResult {
  if (result.state !== "FT") return ZERO_RESULT;

  const parts = prediction.prediction?.trim().split(":") ?? [];
  if (parts.length !== 2) return ZERO_RESULT;

  const predHome = Number(parts[0]);
  const predAway = Number(parts[1]);
  if (!Number.isFinite(predHome) || !Number.isFinite(predAway)) return ZERO_RESULT;

  if (result.homeScore == null || result.awayScore == null) return ZERO_RESULT;
  const actHome = result.homeScore;
  const actAway = result.awayScore;

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

  // CorrectScore mode — tiers in order
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
