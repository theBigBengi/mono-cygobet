import { describe, it, expect, vi, beforeEach } from "vitest";

// --- מוקים ---

const mockInvalidateRanking = vi.fn(async () => {});
const mockInvalidateUserStats = vi.fn(async () => {});
const mockInvalidateH2H = vi.fn(async () => {});

vi.mock("../../../../../lib/cache-invalidation", () => ({
  invalidateRankingCache: (...args: unknown[]) => mockInvalidateRanking(...args),
  invalidateUserStatsCache: (...args: unknown[]) => mockInvalidateUserStats(...args),
  invalidateH2HCache: (...args: unknown[]) => mockInvalidateH2H(...args),
}));

// מוק פשוט לדירוג — מחזיר תוצאה בסיסית
vi.mock("../ranking", () => ({
  getGroupRanking: vi.fn(async () => ({
    status: "success",
    data: [
      { userId: 100, username: "alice", rank: 1, totalPoints: 10 },
      { userId: 200, username: "bob", rank: 2, totalPoints: 5 },
    ],
    message: "ok",
  })),
}));

vi.mock("../chat-events", () => ({
  emitSystemEvent: vi.fn(async () => {}),
}));

vi.mock("../../../../../logger", () => ({
  getLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("../../../../../etl/transform/fixtures.transform", () => ({
  parseScores: vi.fn(() => ({ homeScore: null, awayScore: null })),
}));

vi.mock("../../scoring", () => ({
  calculateScore: vi.fn(() => ({
    points: 3,
    winningCorrectScore: true,
    winningCorrectDifference: false,
    winningMatchWinner: true,
  })),
}));

vi.mock("@repo/utils", () => ({
  FINISHED_STATES: ["FT", "AET", "FT_PEN"],
  CANCELLED_STATES: ["CAN", "INT"],
}));

// מוק של פריזמה — הכי מורכב
vi.mock("@repo/db", () => ({
  prisma: {
    fixtures: {
      findMany: vi.fn(async () => [
        {
          id: 500,
          homeScore90: 2,
          awayScore90: 1,
          homeScoreET: null,
          awayScoreET: null,
          penHome: null,
          penAway: null,
          result: "2-1",
          state: "FT",
        },
      ]),
    },
    groupFixtures: {
      findMany: vi.fn(async () => [
        { id: 10, groupId: 7, fixtureId: 500 },
      ]),
      groupBy: vi.fn(async () => []),
    },
    groupRules: {
      findMany: vi.fn(async () => [
        {
          groupId: 7,
          predictionMode: "CorrectScore",
          onTheNosePoints: 3,
          correctDifferencePoints: 2,
          outcomePoints: 1,
          koRoundMode: "FullTime",
        },
      ]),
    },
    groupPredictions: {
      findMany: vi.fn(async () => [
        {
          id: 999,
          userId: 100,
          groupId: 7,
          groupFixtureId: 10,
          prediction: "2:1",
        },
      ]),
      update: vi.fn(async () => ({})),
    },
    groups: {
      findMany: vi.fn(async () => [{ id: 7, creatorId: 100 }]),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
    rankingSnapshots: {
      createMany: vi.fn(async () => ({ count: 2 })),
    },
    $transaction: vi.fn(async (ops: unknown[]) => {
      // מריץ כל פעולה (פעולות update מוקיות)
      for (const op of ops) {
        if (typeof op === "object" && op !== null && "then" in op) {
          await (op as Promise<unknown>);
        }
      }
    }),
  },
}));

import { settlePredictionsForFixtures } from "../settlement";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("settlePredictionsForFixtures — ניקוי קאש", () => {
  it("מנקה קאש דירוג אחרי הטרנזקציה", async () => {
    await settlePredictionsForFixtures([500]);

    expect(mockInvalidateRanking).toHaveBeenCalledWith([7]);
  });

  it("מנקה קאש סטטיסטיקות משתמש לאחר סליקה", async () => {
    await settlePredictionsForFixtures([500]);

    expect(mockInvalidateUserStats).toHaveBeenCalledWith([100]);
  });

  it("מנקה קאש השוואה ישירה לאחר סליקה", async () => {
    await settlePredictionsForFixtures([500]);

    expect(mockInvalidateH2H).toHaveBeenCalledWith([100]);
  });

  it("ניקוי דירוג קורה לפני שליפת דירוג חדש", async () => {
    const callOrder: string[] = [];

    mockInvalidateRanking.mockImplementation(async () => {
      callOrder.push("invalidate");
    });

    const { getGroupRanking } = await import("../ranking");
    vi.mocked(getGroupRanking).mockImplementation(async () => {
      callOrder.push("getRanking");
      return { status: "success", data: [], message: "ok" };
    });

    await settlePredictionsForFixtures([500]);

    // ניקוי חייב לקרות לפני שליפת הדירוג ה"חדש" (after)
    const invalidateIndex = callOrder.indexOf("invalidate");
    const lastGetRankingIndex = callOrder.lastIndexOf("getRanking");

    expect(invalidateIndex).toBeGreaterThan(-1);
    expect(lastGetRankingIndex).toBeGreaterThan(-1);
    expect(invalidateIndex).toBeLessThan(lastGetRankingIndex);
  });

  it("לא קורס על רשימת פיקסצ׳רים ריקה", async () => {
    const result = await settlePredictionsForFixtures([]);

    expect(result).toEqual({ settled: 0, skipped: 0, groupsEnded: 0 });
    expect(mockInvalidateRanking).not.toHaveBeenCalled();
  });
});
