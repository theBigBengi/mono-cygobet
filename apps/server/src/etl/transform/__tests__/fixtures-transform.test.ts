import { describe, it, expect } from "vitest";

import { parseScores, isValidFixtureStateTransition } from "../fixtures.transform";

// ---------------------------------------------------------------------------
// parseScores
// ---------------------------------------------------------------------------

describe("parseScores", () => {
  it("parses 'x-y' format", () => {
    expect(parseScores("2-1")).toEqual({ homeScore: 2, awayScore: 1 });
  });

  it("parses 'x:y' format", () => {
    expect(parseScores("3:0")).toEqual({ homeScore: 3, awayScore: 0 });
  });

  it("handles 0-0", () => {
    expect(parseScores("0-0")).toEqual({ homeScore: 0, awayScore: 0 });
  });

  it("handles double-digit scores", () => {
    expect(parseScores("10-12")).toEqual({ homeScore: 10, awayScore: 12 });
  });

  it("trims whitespace", () => {
    expect(parseScores("  2-1  ")).toEqual({ homeScore: 2, awayScore: 1 });
  });

  it("returns null for null input", () => {
    expect(parseScores(null)).toEqual({ homeScore: null, awayScore: null });
  });

  it("returns null for undefined", () => {
    expect(parseScores(undefined)).toEqual({ homeScore: null, awayScore: null });
  });

  it("returns null for empty string", () => {
    expect(parseScores("")).toEqual({ homeScore: null, awayScore: null });
  });

  it("returns null for non-score string", () => {
    expect(parseScores("abc")).toEqual({ homeScore: null, awayScore: null });
  });

  it("returns null for single number", () => {
    expect(parseScores("5")).toEqual({ homeScore: null, awayScore: null });
  });

  it("returns null for triple format", () => {
    expect(parseScores("1-2-3")).toEqual({ homeScore: null, awayScore: null });
  });

  it("returns null for negative numbers", () => {
    expect(parseScores("-1-2")).toEqual({ homeScore: null, awayScore: null });
  });
});

// ---------------------------------------------------------------------------
// isValidFixtureStateTransition
// ---------------------------------------------------------------------------

describe("isValidFixtureStateTransition", () => {
  // Same state is always valid
  it.each(["NS", "INPLAY_1ST_HALF", "HT", "FT", "CANCELLED"] as const)(
    "%s → %s (same state) is valid",
    (state) => {
      expect(isValidFixtureStateTransition(state, state)).toBe(true);
    }
  );

  // NOT_STARTED → IN_PLAY / BREAK / CANCELLED
  describe("from NS (not started)", () => {
    it.each(["INPLAY_1ST_HALF", "INPLAY_2ND_HALF", "INPLAY_ET", "INPLAY_PENALTIES"] as const)(
      "NS → %s is valid",
      (next) => {
        expect(isValidFixtureStateTransition("NS", next)).toBe(true);
      }
    );

    it.each(["HT", "BREAK", "EXTRA_TIME_BREAK", "PEN_BREAK"] as const)(
      "NS → %s (break) is valid",
      (next) => {
        expect(isValidFixtureStateTransition("NS", next)).toBe(true);
      }
    );

    it.each(["CANCELLED", "POSTPONED", "SUSPENDED"] as const)(
      "NS → %s (cancelled) is valid",
      (next) => {
        expect(isValidFixtureStateTransition("NS", next)).toBe(true);
      }
    );

    it.each(["FT", "AET", "FT_PEN"] as const)(
      "NS → %s (finished) is INVALID",
      (next) => {
        expect(isValidFixtureStateTransition("NS", next)).toBe(false);
      }
    );
  });

  // IN_PLAY → IN_PLAY / BREAK / FINISHED / CANCELLED
  describe("from INPLAY_1ST_HALF (in play)", () => {
    it("→ INPLAY_2ND_HALF is valid", () => {
      expect(isValidFixtureStateTransition("INPLAY_1ST_HALF", "INPLAY_2ND_HALF")).toBe(true);
    });

    it("→ HT (break) is valid", () => {
      expect(isValidFixtureStateTransition("INPLAY_1ST_HALF", "HT")).toBe(true);
    });

    it("→ FT (finished) is valid", () => {
      expect(isValidFixtureStateTransition("INPLAY_1ST_HALF", "FT")).toBe(true);
    });

    it("→ CANCELLED is valid", () => {
      expect(isValidFixtureStateTransition("INPLAY_1ST_HALF", "CANCELLED")).toBe(true);
    });

    it("→ NS is INVALID", () => {
      expect(isValidFixtureStateTransition("INPLAY_1ST_HALF", "NS")).toBe(false);
    });
  });

  // BREAK → IN_PLAY / BREAK / FINISHED / CANCELLED
  describe("from HT (break)", () => {
    it("→ INPLAY_2ND_HALF is valid", () => {
      expect(isValidFixtureStateTransition("HT", "INPLAY_2ND_HALF")).toBe(true);
    });

    it("→ FT is valid", () => {
      expect(isValidFixtureStateTransition("HT", "FT")).toBe(true);
    });

    it("→ CANCELLED is valid", () => {
      expect(isValidFixtureStateTransition("HT", "CANCELLED")).toBe(true);
    });

    it("→ NS is INVALID", () => {
      expect(isValidFixtureStateTransition("HT", "NS")).toBe(false);
    });
  });

  // FINISHED → terminal (no transitions except same)
  describe("from FT (finished)", () => {
    it.each(["NS", "INPLAY_1ST_HALF", "HT", "CANCELLED", "AET"] as const)(
      "FT → %s is INVALID",
      (next) => {
        expect(isValidFixtureStateTransition("FT", next)).toBe(false);
      }
    );
  });

  // CANCELLED → terminal
  describe("from CANCELLED (terminal)", () => {
    it.each(["NS", "INPLAY_1ST_HALF", "FT", "HT"] as const)(
      "CANCELLED → %s is INVALID",
      (next) => {
        expect(isValidFixtureStateTransition("CANCELLED", next)).toBe(false);
      }
    );
  });
});
