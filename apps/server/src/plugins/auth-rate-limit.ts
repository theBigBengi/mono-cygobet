// src/plugins/auth-rate-limit.ts
// Two-tier rate limiting:
//   1. Global: 100 req/min per IP for all routes (protects against DoS)
//   2. Auth:   10 req/min per IP for login/register/refresh (protects against brute-force)
// Env overrides: RATE_LIMIT_GLOBAL_MAX, AUTH_RATE_LIMIT_MAX, AUTH_RATE_LIMIT_WINDOW_MS

import fp from "fastify-plugin";
import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import { getRedisClient, isRedisConfigured } from "@repo/redis";

const AUTH_RATE_LIMIT_PATHS = new Set([
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
]);

export default fp(async function rateLimitPlugin(fastify: FastifyInstance) {
  const globalMax = parseInt(process.env.RATE_LIMIT_GLOBAL_MAX ?? "100", 10) || 100;
  const authMax = parseInt(process.env.AUTH_RATE_LIMIT_MAX ?? "10", 10) || 10;
  const windowMs =
    parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? "60000", 10) || 60_000;

  // Global rate limit: applies to all routes
  // Use Redis store when available for multi-instance consistency
  await fastify.register(rateLimit, {
    max: globalMax,
    timeWindow: windowMs,
    keyGenerator: (request) => request.ip ?? "unknown",
    ...(isRedisConfigured() && { redis: getRedisClient() }),
    errorResponseBuilder: (_request, context) => ({
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests. Try again later.",
      retryAfter: Math.ceil(context.ttl / 1000),
    }),
  });

  // Stricter limit for auth endpoints (applied per-route via routeConfig)
  fastify.addHook("onRoute", (routeOptions) => {
    const url = routeOptions.url;
    if (AUTH_RATE_LIMIT_PATHS.has(url) && routeOptions.method === "POST") {
      routeOptions.config = {
        ...((routeOptions.config as object) ?? {}),
        rateLimit: {
          max: authMax,
          timeWindow: windowMs,
        },
      };
    }
  });
});
