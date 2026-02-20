import { describe, it, expect, vi, beforeEach } from "vitest";

// מוק — מדמה את מודול הקאש
const mockDel = vi.fn(async () => {});
const mockInvalidatePattern = vi.fn(async () => 0);

vi.mock("../cache", () => ({
  getCache: vi.fn(() => ({
    del: mockDel,
    invalidatePattern: mockInvalidatePattern,
  })),
}));

import {
  invalidateRankingCache,
  invalidateUserStatsCache,
  invalidateH2HCache,
} from "../cache-invalidation";
import { getCache } from "../cache";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("invalidateRankingCache", () => {
  it("מוחק את המפתחות הנכונים לפי מזהי קבוצות", async () => {
    await invalidateRankingCache([1, 2, 3]);

    expect(getCache).toHaveBeenCalledWith("ranking");
    expect(mockDel).toHaveBeenCalledTimes(3);
    expect(mockDel).toHaveBeenCalledWith("1");
    expect(mockDel).toHaveBeenCalledWith("2");
    expect(mockDel).toHaveBeenCalledWith("3");
  });

  it("לא עושה כלום כשהקאש לא זמין", async () => {
    vi.mocked(getCache).mockReturnValueOnce(null);
    await invalidateRankingCache([1, 2]);
    expect(mockDel).not.toHaveBeenCalled();
  });

  it("מטפל ברשימה ריקה בלי שגיאה", async () => {
    await invalidateRankingCache([]);
    expect(mockDel).not.toHaveBeenCalled();
  });
});

describe("invalidateUserStatsCache", () => {
  it("מוחק את המפתחות הנכונים לפי מזהי משתמשים", async () => {
    await invalidateUserStatsCache([10, 20]);

    expect(getCache).toHaveBeenCalledWith("user-stats");
    expect(mockDel).toHaveBeenCalledTimes(2);
    expect(mockDel).toHaveBeenCalledWith("10");
    expect(mockDel).toHaveBeenCalledWith("20");
  });

  it("לא עושה כלום כשהקאש לא זמין", async () => {
    vi.mocked(getCache).mockReturnValueOnce(null);
    await invalidateUserStatsCache([10]);
    expect(mockDel).not.toHaveBeenCalled();
  });
});

describe("invalidateH2HCache", () => {
  it("מנקה את כל ערכי ההשוואה ישירה", async () => {
    await invalidateH2HCache([10, 20]);

    expect(getCache).toHaveBeenCalledWith("h2h");
    expect(mockInvalidatePattern).toHaveBeenCalledWith("*");
  });

  it("לא עושה כלום כשהקאש לא זמין", async () => {
    vi.mocked(getCache).mockReturnValueOnce(null);
    await invalidateH2HCache([10]);
    expect(mockInvalidatePattern).not.toHaveBeenCalled();
  });
});
