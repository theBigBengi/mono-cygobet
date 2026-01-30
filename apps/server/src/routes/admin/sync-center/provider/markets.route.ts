// src/routes/admin/provider/markets.route.ts
import { FastifyPluginAsync } from "fastify";
import { adapter } from "../../../../utils/adapter";
import { AdminProviderMarketsResponse } from "@repo/types";
import { providerResponseSchema } from "../../../../schemas/admin/admin.schemas";

const adminMarketsProviderRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /admin/provider/markets - Get markets from SportMonks provider
  fastify.get<{ Reply: AdminProviderMarketsResponse }>(
    "/markets",
    {
      schema: {
        response: {
          200: providerResponseSchema,
        },
      },
    },
    async (req, reply): Promise<AdminProviderMarketsResponse> => {
      const marketsDto = await adapter.fetchMarkets();

      const data = marketsDto.map((m) => ({
        externalId: m.externalId.toString(),
        name: m.name,
        description: m.description ?? null,
        developerName: m.developerName ?? null,
      }));

      return reply.send({
        status: "success",
        data,
        message: "Markets fetched from provider successfully",
        provider: "sportmonks",
      });
    }
  );
};

export default adminMarketsProviderRoutes;
