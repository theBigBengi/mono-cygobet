import { describe, it, expect, vi, beforeEach } from "vitest";

// --- מוקים ---

// vi.hoisted נותן למשתנה להיות זמין בתוך vi.mock שעולה לתחילת הקובץ
const { mockGetOrSet } = vi.hoisted(() => ({
  mockGetOrSet: vi.fn(
    async (_key: string, _ttl: number, factory: () => Promise<unknown>) => factory()
  ),
}));

vi.mock("../../../../../lib/cache", () => ({
  getCache: vi.fn(() => ({
    getOrSet: mockGetOrSet,
    del: vi.fn(),
  })),
}));

vi.mock("@repo/db", () => ({
  prisma: {
    $queryRaw: vi.fn(async () => [
      {
        user_id: 1,
        username: "alice",
        total_points: "15",
        prediction_count: "5",
        correct_score_count: "2",
        correct_difference_count: "1",
        correct_outcome_count: "2",
      },
      {
        user_id: 2,
        username: "bob",
        total_points: "10",
        prediction_count: "5",
        correct_score_count: "1",
        correct_difference_count: "0",
        correct_outcome_count: "3",
      },
      {
        user_id: 3,
        username: "charlie",
        total_points: "15",
        prediction_count: "5",
        correct_score_count: "2",
        correct_difference_count: "1",
        correct_outcome_count: "1",
      },
    ]),
    rankingSnapshots: {
      findFirst: vi.fn(async () => null),
      findMany: vi.fn(async () => []),
    },
  },
}));

vi.mock("../../permissions", () => ({
  assertGroupMember: vi.fn(async () => {}),
}));

vi.mock("../../repository", () => ({
  repository: {
    findGroupMembersWithUsers: vi.fn(async () => ({
      members: [
        { userId: 1 },
        { userId: 2 },
        { userId: 3 },
        { userId: 4 }, // חבר בלי ניחושים
      ],
      users: [
        { id: 1, username: "alice" },
        { id: 2, username: "bob" },
        { id: 3, username: "charlie" },
        { id: 4, username: "dave" },
      ],
    })),
    findGroupRules: vi.fn(async () => ({
      nudgeEnabled: false,
      nudgeWindowMinutes: null,
    })),
    findGroupFixturesWithFixtureDetails: vi.fn(async () => []),
    findGroupPredictionUserIdsByGroupFixtureIds: vi.fn(async () => []),
    findNudgesByNudgerInGroup: vi.fn(async () => []),
  },
}));

vi.mock("../../../../../utils/dates", () => ({
  nowUnixSeconds: vi.fn(() => 1700000000),
}));

vi.mock("../../../../../logger", () => ({
  getLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

import { getGroupRanking } from "../ranking";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getGroupRanking", () => {
  it("מחזיר תשובת הצלחה", async () => {
    const result = await getGroupRanking(7, 1);

    expect(result.status).toBe("success");
    expect(result.message).toBe("Ranking fetched successfully");
  });

  it("ממיין לפי נקודות יורד", async () => {
    const result = await getGroupRanking(7, 1);
    const points = result.data.map((r) => r.totalPoints);

    // alice=15, charlie=15, bob=10, dave=0
    expect(points).toEqual([15, 15, 10, 0]);
  });

  it("מקצה דירוגים נכונים עם שוויון", async () => {
    const result = await getGroupRanking(7, 1);
    const ranks = result.data.map((r) => ({ name: r.username, rank: r.rank }));

    // alice וcharlie עם אותן נקודות ואותם ניחושים מדויקים — דירוג זהה
    expect(ranks[0]).toEqual({ name: "alice", rank: 1 });
    expect(ranks[1]).toEqual({ name: "charlie", rank: 1 });
    expect(ranks[2]).toEqual({ name: "bob", rank: 3 });
    expect(ranks[3]).toEqual({ name: "dave", rank: 4 });
  });

  it("כולל חברים בלי ניחושים עם אפסים", async () => {
    const result = await getGroupRanking(7, 1);
    const dave = result.data.find((r) => r.username === "dave");

    expect(dave).toBeDefined();
    expect(dave!.totalPoints).toBe(0);
    expect(dave!.predictionCount).toBe(0);
  });

  it("משתמש בקאש עם המפתח והזמן הנכונים", async () => {
    await getGroupRanking(7, 1);

    expect(mockGetOrSet).toHaveBeenCalledWith(
      "7",    // מפתח = מזהה קבוצה
      120,    // זמן חיים = 2 דקות
      expect.any(Function)
    );
  });

  it("לא מוסיף נתוני דחיפה כשהתכונה כבויה", async () => {
    const result = await getGroupRanking(7, 1);

    for (const item of result.data) {
      expect(item.nudgeable).toBeUndefined();
      expect(item.nudgeFixtureId).toBeUndefined();
    }
  });
});

describe("getGroupRanking — שוויון עם הפרש נכון", () => {
  it("שובר שוויון לפי ניחושים מדויקים, אחכ הפרש נכון", async () => {
    const result = await getGroupRanking(7, 1);

    // alice ו-charlie שניהם עם 15 נקודות ו-2 ניחושים מדויקים ו-1 הפרש נכון
    // הם באותו דירוג, ממוינים לפי שם
    const topTwo = result.data.filter((r) => r.rank === 1);
    expect(topTwo).toHaveLength(2);
    expect(topTwo.map((r) => r.username)).toEqual(["alice", "charlie"]);
  });
});
