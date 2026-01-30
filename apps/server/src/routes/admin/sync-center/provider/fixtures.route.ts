// src/routes/admin/provider/fixtures.route.ts
import { FastifyPluginAsync } from "fastify";
import { adapter } from "../../../../utils/adapter";
import { AdminProviderFixturesResponse } from "@repo/types";
import { providerResponseSchema } from "../../../../schemas/admin/admin.schemas";
import { prisma } from "@repo/db";

const adminFixturesProviderRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /admin/provider/fixtures - Get fixtures from sports-data provider
  // Note: This endpoint requires date range parameters for fetching fixtures
  fastify.get<{ Reply: AdminProviderFixturesResponse }>(
    "/fixtures",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            from: { type: "string" }, // ISO date string
            to: { type: "string" }, // ISO date string
            leagueIds: { type: "string" }, // Comma-separated string of external IDs
            countryIds: { type: "string" }, // Comma-separated string of external IDs
          },
        },
        response: {
          200: providerResponseSchema,
        },
      },
    },
    async (req, reply): Promise<AdminProviderFixturesResponse> => {
      const query = req.query as {
        from?: string;
        to?: string;
        leagueIds?: string; // Comma-separated string of external IDs
        countryIds?: string; // Comma-separated string of external IDs
      };

      // Default to 3 days back and 4 days ahead if not provided
      let fromDate: string;
      let toDate: string;
      let fromDateOnly: string;
      let toDateOnly: string;

      if (query.from && query.to) {
        // Extract date-only part (YYYY-MM-DD) - avoid timezone issues
        // If the string already contains time, extract just the date part
        fromDateOnly = query.from.split("T")[0]!.split(" ")[0]!;
        toDateOnly = query.to.split("T")[0]!.split(" ")[0]!;

        // Use date-only format (YYYY-MM-DD) in the URL path
        // The API expects dates in YYYY-MM-DD format, not full ISO strings
        fromDate = fromDateOnly;
        toDate = toDateOnly;
      } else {
        const now = new Date();
        const from = new Date(now);
        from.setDate(from.getDate() - 3);
        from.setHours(0, 0, 0, 0);
        const to = new Date(now);
        to.setDate(to.getDate() + 4);
        to.setHours(23, 59, 59, 999);

        // Extract date-only (YYYY-MM-DD) for API calls
        fromDateOnly = from.toISOString().split("T")[0]!;
        toDateOnly = to.toISOString().split("T")[0]!;
        fromDate = fromDateOnly;
        toDate = toDateOnly;
      }

      // Fetch fixtures between dates - get raw data with league, country, and odds
      const fixturesDto = await adapter.fetchFixturesBetween(fromDate, toDate, {
        includeOdds: true,
        includeScores: true,
      });

      return reply.send({
        status: "success",
        data: fixturesDto,
        message: "Fixtures fetched from provider successfully",
        provider: "sportmonks",
      });
    }
  );
};

export default adminFixturesProviderRoutes;
