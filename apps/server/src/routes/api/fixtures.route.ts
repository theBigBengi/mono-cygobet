import { FastifyPluginAsync } from "fastify";
import {
  upcomingMobileFixturesQuerystringSchema,
  upcomingMobileFixturesResponseSchema,
} from "../../schemas/fixtures.schemas";
import {
  getUpcomingFixtures,
} from "../../services/api/fixtures";
import { parseOptionalDate } from "../../utils/dates";
import type {
  ApiUpcomingFixturesInclude,
  ApiUpcomingFixturesQuery,
} from "@repo/types";

const INVALID_DATE_MESSAGE =
  "Invalid 'from'/'to'. Use ISO datetime (e.g. 2026-01-06T00:00:00Z) or unix seconds/millis.";

function parseBooleanOrDefault(value: unknown, defaultValue: boolean): boolean {
  if (value == null) return defaultValue;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    if (s === "true" || s === "1" || s === "yes") return true;
    if (s === "false" || s === "0" || s === "no") return false;
  }
  return defaultValue;
}

function parseCsvOrArray(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value))
    return value.map(String).flatMap((s) => s.split(","));
  return String(value).split(",");
}

function parseLeagueIds(value: unknown): number[] {
  const parts = parseCsvOrArray(value)
    .map((s) => s.trim())
    .filter(Boolean);
  const ids = parts
    .map((s) => Number(s))
    .filter((n) => Number.isInteger(n) && n > 0);
  return Array.from(new Set(ids));
}

function parseStringIds(value: unknown): string[] {
  const parts = parseCsvOrArray(value)
    .map((s) => s.trim())
    .filter(Boolean);
  const ids: string[] = [];
  for (const p of parts) {
    if (!/^\d+$/.test(p)) continue;
    ids.push(p);
  }
  return Array.from(new Set(ids));
}

function parseInclude(value: unknown): Set<ApiUpcomingFixturesInclude> {
  const allowed: ApiUpcomingFixturesInclude[] = [
    "odds",
    "teams",
    "league",
    "country",
  ];
  const allowedSet = new Set<string>(allowed);
  const parts = parseCsvOrArray(value)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const include = new Set<ApiUpcomingFixturesInclude>();
  for (const p of parts) {
    if (allowedSet.has(p)) include.add(p as ApiUpcomingFixturesInclude);
  }
  return include;
}

const mobileFixturesRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/fixtures/upcoming
   *
   * Route mounting: This file is in routes/api/, so Fastify autoload mounts it at /api.
   * The route path "/fixtures/upcoming" becomes "/api/fixtures/upcoming".
   * Mobile app calls this with baseUrl (host-only, e.g., "http://localhost:4000") + "/api/fixtures/upcoming".
   *
   * - Requires auth + onboarding completion via userAuth.requireOnboardingComplete.
   * - Supports flexible from/to window and filters, with a default 7-day window.
   */
  fastify.get(
    "/fixtures/upcoming",
    {
      preHandler: fastify.userAuth.requireOnboardingComplete,
      schema: {
        querystring: upcomingMobileFixturesQuerystringSchema,
        response: {
          200: upcomingMobileFixturesResponseSchema,
          400: {
            type: "object",
            required: ["status", "message"],
            properties: {
              status: { type: "string", enum: ["error"] },
              message: { type: "string" },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const q = req.query as ApiUpcomingFixturesQuery;
      const now = new Date();
      const from = parseOptionalDate(q.from) ?? now;
      const to =
        parseOptionalDate(q.to) ??
        new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
        return reply.status(400).send({
          status: "error",
          message: INVALID_DATE_MESSAGE,
        });
      }
      if (from.getTime() > to.getTime()) {
        return reply.status(400).send({
          status: "error",
          message: "'from' must be <= 'to'",
        });
      }

      const page = Math.max(1, Number(q.page ?? 1));
      const perPage = Math.max(1, Math.min(50, Number(q.perPage ?? 20)));

      const leagueIds = parseLeagueIds(q.leagues);
      if (q.leagues != null && leagueIds.length === 0) {
        return reply.status(400).send({
          status: "error",
          message: "Invalid 'leagues'. Use comma-separated ids like '1,2,3'.",
        });
      }

      const marketExternalIds = parseStringIds(q.markets);
      if (q.markets != null && marketExternalIds.length === 0) {
        return reply.status(400).send({
          status: "error",
          message: "Invalid 'markets'. Use comma-separated ids like '1,2,3'.",
        });
      }

      const hasOdds = parseBooleanOrDefault(q.hasOdds, false);
      const include = parseInclude(q.include);

      const result = await getUpcomingFixtures({
        from,
        to,
        page,
        perPage,
        leagueIds,
        marketExternalIds,
        hasOdds,
        include,
      });

      return reply.send({
        status: "success",
        data: result.data,
        pagination: result.pagination,
        message: "Upcoming fixtures fetched successfully",
      });
    }
  );
};

export default mobileFixturesRoutes;
