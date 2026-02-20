import { describe, it, expect, vi, beforeEach } from "vitest";

// --- מוקים ---

const { mockGetOrSet } = vi.hoisted(() => ({
  mockGetOrSet: vi.fn(async (_key: string, _ttl: number, factory: () => Promise<unknown>) => {
    return factory();
  }),
}));

vi.mock("../../../../lib/cache", () => ({
  getCache: vi.fn(() => ({
    getOrSet: mockGetOrSet,
    del: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
  })),
}));

// מוק למאגר הנתונים — מחזיר נתונים מינימליים
vi.mock("../repository", () => ({
  findOverallStats: vi.fn(async (userId: number) => ({
    user_id: userId,
    username: `user${userId}`,
    image: null,
    total_points: "10",
    prediction_count: "5",
    settled_count: "3",
    correct_score_count: "1",
    correct_outcome_count: "1",
  })),
  findPerGroupStats: vi.fn(async () => []),
  findRanksPerGroup: vi.fn(async () => []),
  findDistribution: vi.fn(async () => ({
    exact_count: "1",
    difference_count: "1",
    outcome_count: "1",
    miss_count: "2",
  })),
  findRecentForm: vi.fn(async () => []),
  findSparklineData: vi.fn(async () => []),
  findStreakData: vi.fn(async () => []),
  findStreakDataDesc: vi.fn(async () => []),
  findUnderdogWinsCount: vi.fn(async () => 0),
  findEarlyBirdCount: vi.fn(async () => 0),
  findGroupChampionGroups: vi.fn(async () => []),
  findBestRank: vi.fn(async () => null),
  findPercentile: vi.fn(async () => 50),
  findBestLeague: vi.fn(async () => null),
  findH2HSharedGroups: vi.fn(async () => []),
  findH2HUserStats: vi.fn(async () => []),
  findPotentialOpponents: vi.fn(async () => []),
  toNumber: vi.fn((v: string | number | bigint) => {
    if (typeof v === "number") return v;
    if (typeof v === "bigint") return Number(v);
    return parseInt(String(v), 10) || 0;
  }),
}));

vi.mock("../badges", () => ({
  computeBadges: vi.fn(() => []),
  computeMaxStreak: vi.fn(() => 0),
}));

vi.mock("../insights", () => ({
  generateInsights: vi.fn(() => []),
}));

import { getUserStats, getHeadToHead } from "../service";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getUserStats", () => {
  it("מחזיר תשובת הצלחה עם נתוני המשתמש", async () => {
    const result = await getUserStats(42);

    expect(result.status).toBe("success");
    expect(result.data.user.id).toBe(42);
  });

  it("משתמש בקאש עם המפתח הנכון", async () => {
    await getUserStats(42);

    expect(mockGetOrSet).toHaveBeenCalledWith(
      "42",
      300,
      expect.any(Function)
    );
  });

  it("פונקציית החישוב נקראת דרך הקאש", async () => {
    const result1 = await getUserStats(42);
    vi.clearAllMocks();
    const result2 = await getUserStats(42);

    expect(result1.data.user.id).toBe(result2.data.user.id);
    expect(result1.status).toBe(result2.status);
  });
});

describe("getHeadToHead", () => {
  it("משתמש במפתח קנוני — הסדר של המשתמשים לא משנה", async () => {
    await getHeadToHead(10, 5);

    // מפתח קנוני: min:max = "5:10"
    expect(mockGetOrSet).toHaveBeenCalledWith(
      "5:10",
      300,
      expect.any(Function)
    );
  });

  it("אותו מפתח בסדר הפוך", async () => {
    await getHeadToHead(5, 10);

    expect(mockGetOrSet).toHaveBeenCalledWith(
      "5:10",
      300,
      expect.any(Function)
    );
  });

  it("מחזיר תשובת הצלחה", async () => {
    const result = await getHeadToHead(10, 5);
    expect(result.status).toBe("success");
  });
});
