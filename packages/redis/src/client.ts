import Redis from "ioredis";

// ── Types ──────────────────────────────────────────────────────────────

export interface RedisClientOptions {
  /** Redis connection URL (e.g. redis://localhost:6379). Falls back to REDIS_URL env var. */
  url?: string;
  /** Key prefix for all operations (e.g. "cygobet:"). Default: none. */
  keyPrefix?: string;
  /** Max retries per request before giving up. Default: 3. */
  maxRetriesPerRequest?: number;
  /** Connect lazily on first command instead of immediately. Default: false. */
  lazyConnect?: boolean;
  /** Called on connection events for external logging. */
  onEvent?: (event: RedisEvent) => void;
}

export type RedisEvent =
  | { type: "connect" }
  | { type: "ready" }
  | { type: "close" }
  | { type: "reconnecting"; attempt: number }
  | { type: "error"; error: Error };

// ── Singleton management ───────────────────────────────────────────────

let instance: Redis | null = null;
let instanceUrl: string | undefined;

/**
 * Retry strategy with exponential backoff.
 * Retries up to 10 times, starting at 200ms and capping at 5s.
 * Returns `null` after 10 attempts to stop retrying.
 */
function retryStrategy(times: number): number | null {
  if (times > 10) return null;
  return Math.min(times * 200, 5_000);
}

/**
 * Create a new Redis client.
 * Use this when you need a dedicated connection (e.g. for Pub/Sub subscribers).
 * For a shared singleton, use `getRedisClient()` instead.
 */
export function createRedisClient(options: RedisClientOptions = {}): Redis {
  const url = options.url ?? process.env.REDIS_URL;
  if (!url) {
    throw new Error(
      "Redis URL is required. Set REDIS_URL environment variable or pass `url` option."
    );
  }

  const client = new Redis(url, {
    keyPrefix: options.keyPrefix,
    maxRetriesPerRequest: options.maxRetriesPerRequest ?? 3,
    lazyConnect: options.lazyConnect ?? false,
    retryStrategy,
    // Reconnect automatically (ioredis default), but don't throw on startup failure
    enableReadyCheck: true,
  });

  // Forward events to the consumer's callback if provided
  const emit = options.onEvent;
  if (emit) {
    client.on("connect", () => emit({ type: "connect" }));
    client.on("ready", () => emit({ type: "ready" }));
    client.on("close", () => emit({ type: "close" }));
    client.on("reconnecting", (attempt: number) =>
      emit({ type: "reconnecting", attempt })
    );
    client.on("error", (error: Error) => emit({ type: "error", error }));
  }

  return client;
}

/**
 * Get the shared Redis client singleton.
 * Creates the client on first call. Subsequent calls return the same instance.
 * Throws if REDIS_URL is not set.
 */
export function getRedisClient(options: RedisClientOptions = {}): Redis {
  const url = options.url ?? process.env.REDIS_URL;

  // If the singleton exists and the URL hasn't changed, reuse it
  if (instance && instanceUrl === url) return instance;

  // If URL changed, close the old connection
  if (instance && instanceUrl !== url) {
    instance.disconnect();
    instance = null;
  }

  instance = createRedisClient(options);
  instanceUrl = url;
  return instance;
}

/**
 * Check whether a Redis URL is configured.
 * Useful for conditional feature activation (e.g. "use Redis adapter only if available").
 */
export function isRedisConfigured(): boolean {
  return Boolean(process.env.REDIS_URL);
}

/**
 * Gracefully disconnect the shared Redis client.
 * Waits for pending commands to complete before closing.
 */
export async function disconnectRedis(): Promise<void> {
  if (!instance) return;
  await instance.quit();
  instance = null;
  instanceUrl = undefined;
}
