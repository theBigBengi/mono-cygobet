import { FastifyPluginAsync } from "fastify";
import { adapter, currentProviderLabel } from "../../../../utils/adapter";
import { AdminProviderFixturesResponse } from "@repo/types";
import { providerResponseSchema } from "../../../../schemas/admin/admin.schemas";

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
      const fixturesDto = await adapter.fetchLiveFixtures({
        includeScores: true,
      });

      return reply.send({
        status: "success",
        data: fixturesDto,
        message: `${fixturesDto.length} live fixture(s) from provider`,
        provider: currentProviderLabel,
      });
    }
  );
};

export default adminFixturesLiveProviderRoutes;
