import { describe, it, expect } from "vitest";

import {
  calculateScore,
  type ScoringRules,
  type FixtureResult,
  type ScoringResult,
} from "../scoring";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CORRECT_SCORE_RULES: ScoringRules = {
  predictionMode: "CorrectScore",
  onTheNosePoints: 3,
  correctDifferencePoints: 2,
  outcomePoints: 1,
  koRoundMode: "FullTime",
};

const MATCH_WINNER_RULES: ScoringRules = {
  predictionMode: "MatchWinner",
  onTheNosePoints: 3,
  correctDifferencePoints: 2,
  outcomePoints: 1,
  koRoundMode: "FullTime",
};

function ftResult(home: number, away: number): FixtureResult {
  return { homeScore90: home, awayScore90: away, state: "FT" };
}

function aetResult(
  home90: number,
  away90: number,
  homeET: number,
  awayET: number
): FixtureResult {
  return {
    homeScore90: home90,
    awayScore90: away90,
    homeScoreET: homeET,
    awayScoreET: awayET,
    state: "AET",
  };
}

function penResult(
  home90: number,
  away90: number,
  homeET: number,
  awayET: number,
  penHome: number,
  penAway: number
): FixtureResult {
  return {
    homeScore90: home90,
    awayScore90: away90,
    homeScoreET: homeET,
    awayScoreET: awayET,
    penHome,
    penAway,
    state: "FT_PEN",
  };
}

const ZERO: ScoringResult = {
  points: 0,
  winningCorrectScore: false,
  winningCorrectDifference: false,
  winningMatchWinner: false,
};

// ---------------------------------------------------------------------------
// CorrectScore mode — FullTime
// ---------------------------------------------------------------------------

describe("calculateScore — CorrectScore / FullTime", () => {
  const rules = CORRECT_SCORE_RULES;

  it("exact match → onTheNosePoints", () => {
    const r = calculateScore({ prediction: "2:1" }, ftResult(2, 1), rules);
    expect(r.points).toBe(rules.onTheNosePoints);
    expect(r.winningCorrectScore).toBe(true);
    expect(r.winningCorrectDifference).toBe(true);
    expect(r.winningMatchWinner).toBe(true);
  });

  it("correct difference → correctDifferencePoints", () => {
    // predicted 3:2 (diff +1), actual 2:1 (diff +1)
    const r = calculateScore({ prediction: "3:2" }, ftResult(2, 1), rules);
    expect(r.points).toBe(rules.correctDifferencePoints);
    expect(r.winningCorrectScore).toBe(false);
    expect(r.winningCorrectDifference).toBe(true);
  });

  it("correct outcome only → outcomePoints", () => {
    // predicted 3:0 (home wins), actual 1:0 (home wins), diff different
    const r = calculateScore({ prediction: "3:0" }, ftResult(1, 0), rules);
    expect(r.points).toBe(rules.outcomePoints);
    expect(r.winningCorrectScore).toBe(false);
    expect(r.winningCorrectDifference).toBe(false);
    expect(r.winningMatchWinner).toBe(true);
  });

  it("wrong outcome → 0 points", () => {
    // predicted home win, actual away win
    const r = calculateScore({ prediction: "2:0" }, ftResult(0, 1), rules);
    expect(r).toEqual(ZERO);
  });

  it("draw exact match", () => {
    const r = calculateScore({ prediction: "1:1" }, ftResult(1, 1), rules);
    expect(r.points).toBe(rules.onTheNosePoints);
    expect(r.winningCorrectScore).toBe(true);
  });

  it("draw correct difference (0:0 vs 2:2)", () => {
    const r = calculateScore({ prediction: "0:0" }, ftResult(2, 2), rules);
    expect(r.points).toBe(rules.correctDifferencePoints);
  });

  it("0:0 exact", () => {
    const r = calculateScore({ prediction: "0:0" }, ftResult(0, 0), rules);
    expect(r.points).toBe(rules.onTheNosePoints);
  });
});

// ---------------------------------------------------------------------------
// MatchWinner mode
// ---------------------------------------------------------------------------

describe("calculateScore — MatchWinner", () => {
  const rules = MATCH_WINNER_RULES;

  it("correct outcome → outcomePoints", () => {
    const r = calculateScore({ prediction: "5:0" }, ftResult(1, 0), rules);
    expect(r.points).toBe(rules.outcomePoints);
    expect(r.winningMatchWinner).toBe(true);
    expect(r.winningCorrectScore).toBe(false);
    expect(r.winningCorrectDifference).toBe(false);
  });

  it("wrong outcome → 0", () => {
    const r = calculateScore({ prediction: "2:0" }, ftResult(0, 3), rules);
    expect(r).toEqual(ZERO);
  });

  it("draw predicted and draw actual → outcomePoints", () => {
    const r = calculateScore({ prediction: "0:0" }, ftResult(3, 3), rules);
    expect(r.points).toBe(rules.outcomePoints);
  });
});

// ---------------------------------------------------------------------------
// Non-finished states → always zero
// ---------------------------------------------------------------------------

describe("calculateScore — non-finished states", () => {
  it.each(["NS", "INPLAY_1ST_HALF", "HT", "CANCELLED", "POSTPONED"])(
    "state %s → 0",
    (state) => {
      const result: FixtureResult = { homeScore90: 2, awayScore90: 1, state };
      expect(calculateScore({ prediction: "2:1" }, result, CORRECT_SCORE_RULES)).toEqual(ZERO);
    }
  );
});

// ---------------------------------------------------------------------------
// Invalid prediction strings
// ---------------------------------------------------------------------------

describe("calculateScore — invalid predictions", () => {
  it("empty string → 0", () => {
    expect(calculateScore({ prediction: "" }, ftResult(1, 0), CORRECT_SCORE_RULES)).toEqual(ZERO);
  });

  it("garbage → 0", () => {
    expect(calculateScore({ prediction: "abc" }, ftResult(1, 0), CORRECT_SCORE_RULES)).toEqual(ZERO);
  });

  it("single number → 0", () => {
    expect(calculateScore({ prediction: "2" }, ftResult(2, 0), CORRECT_SCORE_RULES)).toEqual(ZERO);
  });
});

// ---------------------------------------------------------------------------
// KO modes — ExtraTime
// ---------------------------------------------------------------------------

describe("calculateScore — ExtraTime mode", () => {
  const rules: ScoringRules = { ...CORRECT_SCORE_RULES, koRoundMode: "ExtraTime" };

  it("uses ET scores when available", () => {
    // predicted 2:1, ET score is 2:1 → exact
    const result = aetResult(1, 1, 2, 1);
    const r = calculateScore({ prediction: "2:1" }, result, rules);
    expect(r.points).toBe(rules.onTheNosePoints);
  });

  it("falls back to 90min scores when ET is null", () => {
    // No ET scores, 90min = 2:0
    const result: FixtureResult = { homeScore90: 2, awayScore90: 0, state: "FT" };
    const r = calculateScore({ prediction: "2:0" }, result, rules);
    expect(r.points).toBe(rules.onTheNosePoints);
  });
});

// ---------------------------------------------------------------------------
// KO modes — Penalties
// ---------------------------------------------------------------------------

describe("calculateScore — Penalties mode", () => {
  const rules: ScoringRules = { ...CORRECT_SCORE_RULES, koRoundMode: "Penalties" };

  it("home wins on pens, predicted home win → outcomePoints", () => {
    const result = penResult(1, 1, 2, 2, 5, 3);
    const r = calculateScore({ prediction: "3:0" }, result, rules);
    expect(r.points).toBe(rules.outcomePoints);
    expect(r.winningMatchWinner).toBe(true);
  });

  it("away wins on pens, predicted away win → outcomePoints", () => {
    const result = penResult(0, 0, 1, 1, 3, 5);
    const r = calculateScore({ prediction: "0:2" }, result, rules);
    expect(r.points).toBe(rules.outcomePoints);
  });

  it("home wins on pens, predicted away win → 0", () => {
    const result = penResult(1, 1, 2, 2, 5, 3);
    const r = calculateScore({ prediction: "0:1" }, result, rules);
    expect(r).toEqual(ZERO);
  });

  it("home wins in ET (no penalties needed), predicted home → outcomePoints", () => {
    const result = aetResult(1, 1, 3, 2);
    const r = calculateScore({ prediction: "1:0" }, result, rules);
    expect(r.points).toBe(rules.outcomePoints);
  });

  it("no ET scores, falls back to 90min winner", () => {
    const result: FixtureResult = { homeScore90: 2, awayScore90: 0, state: "FT" };
    const r = calculateScore({ prediction: "1:0" }, result, rules);
    expect(r.points).toBe(rules.outcomePoints);
  });

  it("Penalties mode ignores exact/difference — only outcome", () => {
    // Exact prediction but penalties mode → still just outcomePoints
    const result = penResult(1, 1, 2, 2, 4, 3);
    const r = calculateScore({ prediction: "2:1" }, result, rules);
    expect(r.points).toBe(rules.outcomePoints);
    expect(r.winningCorrectScore).toBe(false);
    expect(r.winningCorrectDifference).toBe(false);
  });
});
