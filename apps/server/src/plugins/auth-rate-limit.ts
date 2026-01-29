// src/plugins/auth-rate-limit.ts
// Rate limit for auth endpoints (login, register, refresh) by IP.
// Returns 429 with clear body and Retry-After when exceeded.
// Env: AUTH_RATE_LIMIT_MAX (default 10), AUTH_RATE_LIMIT_WINDOW_MS (default 60000).
// If rate limiting exists at load balancer/reverse proxy, document it; this is application-level.
import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

const AUTH_RATE_LIMIT_PATHS = new Set([
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
]);

/** Default: 10 requests per minute per IP (plan suggested 5/10/20). */
const DEFAULT_MAX = 10;
const DEFAULT_WINDOW_MS = 60 * 1000;

function getPathname(url: string): string {
  const q = url.indexOf("?");
  return q === -1 ? url : url.slice(0, q);
}

type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

function getBucket(key: string, now: number, windowMs: number): Bucket {
  let b = store.get(key);
  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + windowMs };
    store.set(key, b);
  }
  return b;
}

export default fp(async function authRateLimitPlugin(fastify: FastifyInstance) {
  const max = Math.max(1, parseInt(process.env.AUTH_RATE_LIMIT_MAX ?? String(DEFAULT_MAX), 10) || DEFAULT_MAX);
  const windowMs = Math.max(1000, parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? String(DEFAULT_WINDOW_MS), 10) || DEFAULT_WINDOW_MS);

  fastify.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.method !== "POST") return;

    const pathname = getPathname(request.url);
    if (!AUTH_RATE_LIMIT_PATHS.has(pathname)) return;

    const ip = request.ip ?? "unknown";
    const now = Date.now();
    const bucket = getBucket(ip, now, windowMs);

    bucket.count += 1;

    if (bucket.count > max) {
      const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000);
      reply.code(429);
      reply.header("Retry-After", String(retryAfterSec));
      return reply.send({
        code: "TOO_MANY_REQUESTS",
        message: "Too many requests. Try again later.",
      });
    }
  });
});
