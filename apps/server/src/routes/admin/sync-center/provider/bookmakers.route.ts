// src/routes/admin/provider/bookmakers.route.ts
import { FastifyPluginAsync } from "fastify";
import { adapter } from "../../../../utils/adapter";
import { AdminProviderBookmakersResponse } from "@repo/types";
import { providerResponseSchema } from "../../../../schemas/admin/admin.schemas";

const adminBookmakersProviderRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /admin/provider/bookmakers - Get bookmakers from sports-data provider
  fastify.get<{ Reply: AdminProviderBookmakersResponse }>(
    "/bookmakers",
    {
      schema: {
        response: {
          200: providerResponseSchema,
        },
      },
    },
    async (req, reply): Promise<AdminProviderBookmakersResponse> => {
      const bookmakersDto = await adapter.fetchBookmakers();

      const data = bookmakersDto.map((b) => ({
        externalId: b.externalId.toString(),
        name: b.name,
      }));

      return reply.send({
        status: "success",
        data,
        message: "Bookmakers fetched from provider successfully",
        provider: "sportmonks",
      });
    }
  );
};

export default adminBookmakersProviderRoutes;

