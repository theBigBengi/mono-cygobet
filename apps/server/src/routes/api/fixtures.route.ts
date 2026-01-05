import { FastifyPluginAsync } from "fastify";
import {
  upcomingMobileFixturesQuerystringSchema,
  upcomingMobileFixturesResponseSchema,
} from "../../schemas/fixtures.schemas";
import { getUpcomingFixtures } from "../../services/api/api.fixtures.service";

function parseOptionalIsoDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const t = Date.parse(value);
  if (Number.isNaN(t)) return null;
  return new Date(t);
}

function toUnixSeconds(d: Date): number {
  return Math.floor(d.getTime() / 1000);
}

const INT32_MAX = 2_147_483_647;
const INT32_MIN = -2_147_483_648;

const mobileFixturesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/fixtures/upcoming",
    {
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
      const q = req.query as {
        from?: string;
        to?: string;
        page?: number;
        perPage?: number;
      };

      const now = new Date();
      const from = parseOptionalIsoDate(q.from) ?? now;
      const to =
        parseOptionalIsoDate(q.to) ??
        new Date(now.getTime() + 72 * 60 * 60 * 1000); // 3 days from now

      if (to.getTime() < from.getTime()) {
        return reply.code(400).send({
          status: "error",
          message: "`to` must be after `from`",
        });
      }

      // DB stores timestamps as INT4 (32-bit). Guard to avoid 500s on out-of-range queries.
      const fromTs = toUnixSeconds(from);
      const toTs = toUnixSeconds(to);
      if (
        fromTs > INT32_MAX ||
        toTs > INT32_MAX ||
        fromTs < INT32_MIN ||
        toTs < INT32_MIN
      ) {
        return reply.code(400).send({
          status: "error",
          message: "`from`/`to` out of supported range",
        });
      }

      const page = Math.max(1, Number(q.page ?? 1));
      const perPage = Math.max(1, Math.min(200, Number(q.perPage ?? 30)));

      const result = await getUpcomingFixtures({ from, to, page, perPage });

      return reply.send({
        status: "success",
        data: result.data,
        pagination: result.pagination,
      });
    }
  );
};

export default mobileFixturesRoutes;
