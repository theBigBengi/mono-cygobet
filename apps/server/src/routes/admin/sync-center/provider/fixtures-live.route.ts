import { FastifyPluginAsync } from "fastify";
import { adapter, currentProviderLabel } from "../../../../utils/adapter";
import { AdminProviderFixturesResponse } from "@repo/types";
import { providerResponseSchema } from "../../../../schemas/admin/admin.schemas";
import { prisma } from "@repo/db";

const adminFixturesLiveProviderRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /admin/sync-center/provider/fixtures/live
  fastify.get<{ Reply: AdminProviderFixturesResponse }>(
    "/fixtures/live",
    {
      schema: {
        response: { 200: providerResponseSchema },
      },
    },
    async (_req, reply): Promise<AdminProviderFixturesResponse> => {
      const [fixturesDto, trackedLeagues] = await Promise.all([
        adapter.fetchLiveFixtures({ includeScores: true }),
        prisma.leagues.findMany({ select: { externalId: true } }),
      ]);

      const trackedLeagueExternalIds = trackedLeagues.map((l) => String(l.externalId));

      return reply.send({
        status: "success",
        data: fixturesDto,
        message: `${fixturesDto.length} live fixture(s) from provider`,
        provider: currentProviderLabel,
        trackedLeagueExternalIds,
      });
    }
  );
};

export default adminFixturesLiveProviderRoutes;
