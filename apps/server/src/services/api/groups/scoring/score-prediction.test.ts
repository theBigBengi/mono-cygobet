/**
 * Unit tests for pure scoring logic.
 * Run: node --test score-prediction.test.ts (from this directory)
 * Or: pnpm -C apps/server exec node --test src/services/api/groups/scoring/score-prediction.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert";
import {
  scorePrediction,
  type PredictionScore,
  type ScoringRules,
} from "./score-prediction";

const rules: ScoringRules = {
  onTheNosePoints: 3,
  correctDifferencePoints: 2,
  outcomePoints: 1,
};

describe("scorePrediction", () => {
  it("exact result: full score, exactResult and correctWinnerOrDraw true", () => {
    const pred: PredictionScore = { home: 2, away: 1 };
    const result: PredictionScore = { home: 2, away: 1 };
    const out = scorePrediction(pred, result, rules);
    assert.strictEqual(out.points, 3);
    assert.strictEqual(out.exactResult, true);
    assert.strictEqual(out.correctWinnerOrDraw, true);
  });

  it("exact draw: onTheNosePoints", () => {
    const pred: PredictionScore = { home: 0, away: 0 };
    const result: PredictionScore = { home: 0, away: 0 };
    const out = scorePrediction(pred, result, rules);
    assert.strictEqual(out.points, 3);
    assert.strictEqual(out.exactResult, true);
  });

  it("correct goal difference, wrong exact: correctDifferencePoints", () => {
    const pred: PredictionScore = { home: 1, away: 0 };
    const result: PredictionScore = { home: 2, away: 1 };
    const out = scorePrediction(pred, result, rules);
    assert.strictEqual(out.points, 2);
    assert.strictEqual(out.exactResult, false);
    assert.strictEqual(out.correctWinnerOrDraw, true);
  });

  it("correct outcome (winner), wrong diff: outcomePoints", () => {
    const pred: PredictionScore = { home: 3, away: 0 };
    const result: PredictionScore = { home: 1, away: 0 };
    const out = scorePrediction(pred, result, rules);
    assert.strictEqual(out.points, 1);
    assert.strictEqual(out.exactResult, false);
    assert.strictEqual(out.correctWinnerOrDraw, true);
  });

  it("correct draw outcome, wrong score: outcomePoints (diff differs so outcome only)", () => {
    const pred: PredictionScore = { home: 1, away: 1 };
    const result: PredictionScore = { home: 2, away: 2 };
    const out = scorePrediction(pred, result, rules);
    // Same goal diff (0) so correctDifferencePoints applies first
    assert.strictEqual(out.points, 2);
    assert.strictEqual(out.exactResult, false);
    assert.strictEqual(out.correctWinnerOrDraw, true);
  });

  it("correct outcome only (wrong diff): outcomePoints", () => {
    const pred: PredictionScore = { home: 3, away: 0 };
    const result: PredictionScore = { home: 1, away: 0 };
    const out = scorePrediction(pred, result, rules);
    assert.strictEqual(out.points, 1);
    assert.strictEqual(out.exactResult, false);
    assert.strictEqual(out.correctWinnerOrDraw, true);
  });

  it("wrong outcome: zero points", () => {
    const pred: PredictionScore = { home: 2, away: 1 };
    const result: PredictionScore = { home: 1, away: 2 };
    const out = scorePrediction(pred, result, rules);
    assert.strictEqual(out.points, 0);
    assert.strictEqual(out.exactResult, false);
    assert.strictEqual(out.correctWinnerOrDraw, false);
  });

  it("predicted draw, actual home win: zero", () => {
    const pred: PredictionScore = { home: 0, away: 0 };
    const result: PredictionScore = { home: 1, away: 0 };
    const out = scorePrediction(pred, result, rules);
    assert.strictEqual(out.points, 0);
    assert.strictEqual(out.correctWinnerOrDraw, false);
  });

  it("uses custom rule values", () => {
    const customRules: ScoringRules = {
      onTheNosePoints: 5,
      correctDifferencePoints: 3,
      outcomePoints: 1,
    };
    const outExact = scorePrediction(
      { home: 1, away: 0 },
      { home: 1, away: 0 },
      customRules
    );
    assert.strictEqual(outExact.points, 5);

    const outDiff = scorePrediction(
      { home: 3, away: 1 },
      { home: 2, away: 0 },
      customRules
    );
    assert.strictEqual(outDiff.points, 3);

    const outOutcome = scorePrediction(
      { home: 3, away: 0 },
      { home: 1, away: 0 },
      customRules
    );
    assert.strictEqual(outOutcome.points, 1);
  });
});
