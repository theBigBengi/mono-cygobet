import type Redis from "ioredis";

// ── Types ──────────────────────────────────────────────────────────────

export interface CacheOptions {
  /** Prefix for all cache keys. Avoids collisions between different cache domains. */
  prefix: string;
}

/** Internal envelope so we can distinguish a cached `null` from a cache miss. */
interface CacheEnvelope<T> {
  v: T;
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
  /** In-flight factory calls for singleflight dedup (prevents cache stampede). */
  private readonly inflight = new Map<string, Promise<unknown>>();

  constructor(redis: Redis, options: CacheOptions) {
    this.redis = redis;
    this.prefix = options.prefix;
  }

  // ── Core operations ────────────────────────────────────────────────

  /** Build the full Redis key from a logical key. */
  private key(logicalKey: string): string {
    return `${this.prefix}:${logicalKey}`;
  }

  /**
   * Internal get that distinguishes a cache miss from a cached falsy value.
   * Returns `{ hit: true, value }` on hit, `{ hit: false }` on miss.
   */
  private async rawGet<T>(
    key: string
  ): Promise<{ hit: true; value: T } | { hit: false }> {
    const raw = await this.redis.get(this.key(key));
    if (raw === null) return { hit: false };
    try {
      const parsed = JSON.parse(raw);
      // Validate envelope format
      if (parsed !== null && typeof parsed === "object" && "v" in parsed) {
        return { hit: true, value: (parsed as CacheEnvelope<T>).v };
      }
      // Legacy or corrupted entry — treat as miss and clean up
      await this.del(key);
      return { hit: false };
    } catch {
      // Corrupted JSON — treat as miss and clean up
      await this.del(key);
      return { hit: false };
    }
  }

  /** Get a cached value. Returns `null` on miss. */
  async get<T>(key: string): Promise<T | null> {
    const result = await this.rawGet<T>(key);
    return result.hit ? result.value : null;
  }

  /** Store a value with a TTL (in seconds). */
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const envelope: CacheEnvelope<T> = { v: value };
    await this.redis.set(
      this.key(key),
      JSON.stringify(envelope),
      "EX",
      ttlSeconds
    );
  }

  /** Delete a cached entry. */
  async del(key: string): Promise<void> {
    await this.redis.del(this.key(key));
  }

  /**
   * Cache-aside pattern: return cached value if available,
   * otherwise call `factory`, cache the result, and return it.
   *
   * Includes singleflight dedup — concurrent calls for the same key
   * share a single factory invocation instead of stampeding.
   */
  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    factory: () => Promise<T>
  ): Promise<T> {
    const result = await this.rawGet<T>(key);
    if (result.hit) return result.value;

    const fullKey = this.key(key);

    // Singleflight: if another caller is already computing this key, wait for it
    const existing = this.inflight.get(fullKey) as Promise<T> | undefined;
    if (existing) return existing;

    const promise = (async () => {
      const value = await factory();
      await this.set(key, value, ttlSeconds);
      return value;
    })();

    this.inflight.set(fullKey, promise);

    try {
      return await promise;
    } finally {
      this.inflight.delete(fullKey);
    }
  }

  // ── Bulk operations ────────────────────────────────────────────────

  /**
   * Invalidate all keys matching a pattern within this cache's prefix.
   * Uses SCAN (non-blocking) instead of KEYS (which blocks Redis).
   *
   * Handles ioredis `keyPrefix` correctly: SCAN patterns include the
   * client prefix, and matched keys are stripped before deletion
   * (since ioredis re-adds the prefix on `DEL`).
   *
   * @param pattern - Glob pattern relative to the prefix (e.g. "group:*")
   */
  async invalidatePattern(pattern: string): Promise<number> {
    const ioredisPrefix = this.redis.options.keyPrefix ?? "";
    const fullPattern = `${ioredisPrefix}${this.key(pattern)}`;
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
        // Strip ioredis keyPrefix since del() will re-add it automatically
        const cleanKeys = ioredisPrefix
          ? keys.map((k) => k.slice(ioredisPrefix.length))
          : keys;
        await this.redis.del(...cleanKeys);
        deleted += keys.length;
      }
    } while (cursor !== "0");

    return deleted;
  }
}
