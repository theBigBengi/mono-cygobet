// src/routes/admin/provider/odds.route.ts
import { FastifyPluginAsync } from "fastify";
import { adapter, currentProviderLabel } from "../../../../utils/adapter";
import { AdminProviderOddsResponse } from "@repo/types";
import { providerResponseSchema } from "../../../../schemas/admin/admin.schemas";
import type { OddsFetchOptions } from "@repo/sports-data";

const adminOddsProviderRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /admin/provider/odds - Get odds from sports-data provider
  fastify.get<{ Reply: AdminProviderOddsResponse }>(
    "/odds",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            from: { type: "string" }, // YYYY-MM-DD
            to: { type: "string" }, // YYYY-MM-DD
            bookmakerIds: { type: "string" }, // comma-separated bookmaker external IDs
            marketIds: { type: "string" }, // comma-separated market external IDs
            fixtureStates: { type: "string" }, // comma-separated fixture states, optional - if not provided, returns all statuses
          },
        },
        response: { 200: providerResponseSchema },
      },
    },
    async (req, reply): Promise<AdminProviderOddsResponse> => {
      const query = req.query as {
        from?: string;
        to?: string;
        bookmakerIds?: string;
        marketIds?: string;
        fixtureStates?: string;
      };

      // Default to today -> +7d if not provided
      let fromDate: string;
      let toDate: string;
      if (query.from && query.to) {
        fromDate = query.from.split("T")[0]!.split(" ")[0]!;
        toDate = query.to.split("T")[0]!.split(" ")[0]!;
      } else {
        const now = new Date();
        const from = new Date(now);
        from.setHours(0, 0, 0, 0);
        const to = new Date(now);
        to.setDate(to.getDate() + 7);
        to.setHours(23, 59, 59, 999);
        fromDate = from.toISOString().split("T")[0]!;
        toDate = to.toISOString().split("T")[0]!;
      }

      const bookmakerIds = query.bookmakerIds
        ?.split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const marketIds = query.marketIds
        ?.split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const oddsOpts: OddsFetchOptions = {};
      if (bookmakerIds?.length) oddsOpts.bookmakerIds = bookmakerIds;
      if (marketIds?.length) oddsOpts.marketIds = marketIds;

      const odds = await adapter.fetchOddsBetween(fromDate, toDate, oddsOpts);

      return reply.send({
        status: "success",
        data: odds as any,
        message: "Odds fetched from provider successfully",
        provider: currentProviderLabel,
      });
    }
  );
};

export default adminOddsProviderRoutes;
