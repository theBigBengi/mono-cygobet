import type Redis from "ioredis";

// ── Types ──────────────────────────────────────────────────────────────

export interface CacheOptions {
  /** Prefix for all cache keys. Avoids collisions between different cache domains. */
  prefix: string;
}

/**
 * A thin, type-safe caching layer over Redis.
 *
 * Designed for the cache-aside (lazy-loading) pattern:
 *   1. Check cache  →  hit? return cached value
 *   2. Miss? execute factory  →  store result in cache  →  return
 *
 * @example
 * ```ts
 * const cache = new Cache(redisClient, { prefix: "standings" });
 *
 * const standings = await cache.getOrSet(
 *   `group:${groupId}`,
 *   10, // TTL in seconds
 *   () => computeStandings(groupId)
 * );
 * ```
 */
export class Cache {
  private readonly redis: Redis;
  private readonly prefix: string;

  constructor(redis: Redis, options: CacheOptions) {
    this.redis = redis;
    this.prefix = options.prefix;
  }

  // ── Core operations ────────────────────────────────────────────────

  /** Build the full Redis key from a logical key. */
  private key(logicalKey: string): string {
    return `${this.prefix}:${logicalKey}`;
  }

  /** Get a cached value. Returns `null` on miss. */
  async get<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get(this.key(key));
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      // Corrupted entry — treat as miss and clean up
      await this.del(key);
      return null;
    }
  }

  /** Store a value with a TTL (in seconds). */
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const raw = JSON.stringify(value);
    await this.redis.set(this.key(key), raw, "EX", ttlSeconds);
  }

  /** Delete a cached entry. */
  async del(key: string): Promise<void> {
    await this.redis.del(this.key(key));
  }

  /**
   * Cache-aside pattern: return cached value if available,
   * otherwise call `factory`, cache the result, and return it.
   */
  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    factory: () => Promise<T>
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await factory();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  // ── Bulk operations ────────────────────────────────────────────────

  /**
   * Invalidate all keys matching a pattern within this cache's prefix.
   * Uses SCAN (non-blocking) instead of KEYS (which blocks Redis).
   *
   * @param pattern - Glob pattern relative to the prefix (e.g. "group:*")
   */
  async invalidatePattern(pattern: string): Promise<number> {
    const fullPattern = this.key(pattern);
    let deleted = 0;
    let cursor = "0";

    do {
      const [nextCursor, keys] = await this.redis.scan(
        cursor,
        "MATCH",
        fullPattern,
        "COUNT",
        100
      );
      cursor = nextCursor;

      if (keys.length > 0) {
        await this.redis.del(...keys);
        deleted += keys.length;
      }
    } while (cursor !== "0");

    return deleted;
  }
}
