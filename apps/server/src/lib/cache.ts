// lib/cache.ts
// Application-level cache factory. Returns domain-scoped Cache instances
// backed by the shared Redis singleton. Returns null when Redis is not configured.

import { Cache, getRedisClient, isRedisConfigured } from "@repo/redis";

const caches = new Map<string, Cache>();

/**
 * Get a Cache instance scoped to the given domain.
 * Keys in Redis will look like `cygobet:<domain>:<logicalKey>`.
 *
 * Returns `null` when Redis is not configured (graceful fallback).
 */
export function getCache(domain: string): Cache | null {
  if (!isRedisConfigured()) return null;

  let cache = caches.get(domain);
  if (!cache) {
    cache = new Cache(getRedisClient(), { prefix: `cygobet:${domain}` });
    caches.set(domain, cache);
  }
  return cache;
}
