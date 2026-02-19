// Client lifecycle
export {
  createRedisClient,
  getRedisClient,
  isRedisConfigured,
  disconnectRedis,
} from "./client.js";

// Types
export type { RedisClientOptions, RedisEvent } from "./client.js";

// Cache utility
export { Cache } from "./cache.js";
export type { CacheOptions } from "./cache.js";

// Re-export Redis type for consumers that need to type-hint the client
export type { default as Redis } from "ioredis";
