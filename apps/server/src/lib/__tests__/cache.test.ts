import { describe, it, expect, vi, beforeEach } from "vitest";

// מוק לחבילת הרדיס — חייב להיות לפני הייבוא של הקוד שנבדק
vi.mock("@repo/redis", () => {
  class FakeCache {
    prefix: string;
    constructor(_redis: unknown, opts: { prefix: string }) {
      this.prefix = opts.prefix;
    }
    async get() { return null; }
    async set() {}
    async del() {}
    async getOrSet(_k: string, _t: number, fn: () => Promise<unknown>) { return fn(); }
    async invalidatePattern() { return 0; }
  }

  return {
    Cache: FakeCache,
    isRedisConfigured: vi.fn(() => true),
    getRedisClient: vi.fn(() => ({})),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

describe("getCache", () => {
  it("מחזיר null כשרדיס לא מוגדר", async () => {
    const redis = await import("@repo/redis");
    vi.mocked(redis.isRedisConfigured).mockReturnValue(false);

    const { getCache } = await import("../cache");
    expect(getCache("test-domain")).toBeNull();
  });

  it("מחזיר אובייקט קאש כשרדיס מוגדר", async () => {
    const redis = await import("@repo/redis");
    vi.mocked(redis.isRedisConfigured).mockReturnValue(true);

    const { getCache } = await import("../cache");
    const cache = getCache("ranking");
    expect(cache).not.toBeNull();
  });

  it("מחזיר את אותו אובייקט עבור אותו דומיין", async () => {
    const redis = await import("@repo/redis");
    vi.mocked(redis.isRedisConfigured).mockReturnValue(true);

    const { getCache } = await import("../cache");
    const a = getCache("ranking");
    const b = getCache("ranking");
    expect(a).toBe(b);
  });

  it("מחזיר אובייקטים שונים לדומיינים שונים", async () => {
    const redis = await import("@repo/redis");
    vi.mocked(redis.isRedisConfigured).mockReturnValue(true);

    const { getCache } = await import("../cache");
    const a = getCache("ranking");
    const b = getCache("user-stats");
    expect(a).not.toBe(b);
  });
});
