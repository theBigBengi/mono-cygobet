import { describe, it, expect, vi, beforeEach } from "vitest";

// --- מוקים ---

const mockInvalidateRanking = vi.fn(async () => {});

vi.mock("../../../../../lib/cache-invalidation", () => ({
  invalidateRankingCache: (...args: unknown[]) => mockInvalidateRanking(...args),
}));

vi.mock("../../permissions", () => ({
  assertGroupMember: vi.fn(async () => {}),
}));

vi.mock("../../helpers", () => ({
  hasMatchStarted: vi.fn(() => false),
}));

vi.mock("../../validators/group-validators", () => ({
  validateFixtureIdsBelongToGroup: vi.fn(async (_gid: number, fixtureIds: number[]) =>
    fixtureIds.map((fid, i) => ({ id: i + 1, fixtureId: fid, groupId: 7 }))
  ),
}));

vi.mock("../../repository", () => ({
  repository: {
    findGroupFixtureByGroupAndFixture: vi.fn(async () => ({ id: 1 })),
    findFixtureByGroupFixtureId: vi.fn(async () => ({
      startTimestamp: Math.floor(Date.now() / 1000) + 3600, // שעה מעכשיו
    })),
    upsertGroupPrediction: vi.fn(async () => {}),
    upsertGroupPredictionsBatch: vi.fn(async () => {}),
    findStartedFixturesByGroupFixtureIds: vi.fn(async () => []),
  },
}));

vi.mock("../../../../../logger", () => ({
  getLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

import { saveGroupPrediction, saveGroupPredictionsBatch } from "../predictions";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("saveGroupPrediction — ניקוי קאש", () => {
  it("מנקה קאש דירוג אחרי שמירת ניחוש", async () => {
    await saveGroupPrediction(7, 500, 1, { home: 2, away: 1 });

    expect(mockInvalidateRanking).toHaveBeenCalledWith([7]);
  });

  it("מנקה רק את הקבוצה הרלוונטית", async () => {
    await saveGroupPrediction(7, 500, 1, { home: 2, away: 1 });
    await saveGroupPrediction(8, 501, 1, { home: 0, away: 0 });

    expect(mockInvalidateRanking).toHaveBeenCalledTimes(2);
    expect(mockInvalidateRanking).toHaveBeenCalledWith([7]);
    expect(mockInvalidateRanking).toHaveBeenCalledWith([8]);
  });
});

describe("saveGroupPredictionsBatch — ניקוי קאש", () => {
  it("מנקה קאש דירוג אחרי שמירת אצווה", async () => {
    await saveGroupPredictionsBatch(7, 1, [
      { fixtureId: 500, home: 2, away: 1 },
      { fixtureId: 501, home: 1, away: 1 },
    ]);

    expect(mockInvalidateRanking).toHaveBeenCalledWith([7]);
  });

  it("לא מנקה קאש כשאין ניחושים לשמור", async () => {
    await saveGroupPredictionsBatch(7, 1, []);

    expect(mockInvalidateRanking).not.toHaveBeenCalled();
  });
});
