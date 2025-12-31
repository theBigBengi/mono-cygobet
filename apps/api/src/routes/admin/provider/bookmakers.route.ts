// src/routes/admin/provider/bookmakers.route.ts
import { FastifyPluginAsync } from "fastify";
import { SportMonksAdapter } from "@repo/sports-data/adapters/sportmonks";
import { AdminProviderBookmakersResponse } from "@repo/types";
import { providerResponseSchema } from "../../../schemas/admin.schemas";

const adminBookmakersProviderRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /admin/provider/bookmakers - Get bookmakers from SportMonks provider
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
      const adapter = new SportMonksAdapter({
        token: process.env.SPORTMONKS_API_TOKEN,
        footballBaseUrl: process.env.SPORTMONKS_FOOTBALL_BASE_URL,
        coreBaseUrl: process.env.SPORTMONKS_CORE_BASE_URL,
        authMode:
          (process.env.SPORTMONKS_AUTH_MODE as "query" | "header") || "query",
      });

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

