// src/routes/admin/db/bookmakers.route.ts
import { FastifyPluginAsync } from "fastify";
import { prisma } from "@repo/db";
import { BookmakersService } from "../../../services/bookmakers.service";
import { AdminBookmakersListResponse, AdminBookmakerResponse } from "@repo/types";
import {
  listBookmakersQuerystringSchema,
  listBookmakersResponseSchema,
  getBookmakerParamsSchema,
  getBookmakerResponseSchema,
  getBookmaker404ResponseSchema,
  searchBookmakersQuerystringSchema,
  searchBookmakersResponseSchema,
} from "../../../schemas/bookmakers.schemas";

const adminBookmakersDbRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new BookmakersService(fastify);

  // GET /admin/db/bookmakers - List bookmakers from database
  fastify.get<{ Reply: AdminBookmakersListResponse }>(
    "/bookmakers",
    {
      schema: {
        querystring: listBookmakersQuerystringSchema,
        response: {
          200: listBookmakersResponseSchema,
        },
      },
    },
    async (req, reply): Promise<AdminBookmakersListResponse> => {
      const query = req.query as {
        page?: number;
        perPage?: number;
      };

      const page = query.page ?? 1;
      const perPage = query.perPage ?? 20;
      const skip = (page - 1) * perPage;
      const take = perPage;

      const { bookmakers, count } = await service.get({
        take,
        skip,
      });

      const data = bookmakers.map((b) => ({
        id: b.id,
        name: b.name,
        externalId: b.externalId?.toString() ?? null,
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
      }));

      return reply.send({
        status: "success",
        data,
        pagination: {
          page,
          perPage,
          totalItems: count,
          totalPages: Math.ceil(count / perPage),
        },
        message: "Bookmakers fetched from database successfully",
      });
    }
  );

  // GET /admin/db/bookmakers/:id - Get a single bookmaker by ID
  fastify.get<{ Reply: AdminBookmakerResponse }>(
    "/bookmakers/:id",
    {
      schema: {
        params: getBookmakerParamsSchema,
        response: {
          200: getBookmakerResponseSchema,
          404: getBookmaker404ResponseSchema,
        },
      },
    },
    async (req, reply): Promise<AdminBookmakerResponse> => {
      const { id } = req.params;
      const bookmakerId = Number(id);

      if (isNaN(bookmakerId)) {
        return reply.status(400).send({
          status: "error",
          message: `Invalid bookmaker ID: ${id}`,
        });
      }

      try {
        const bookmaker = await service.getById(bookmakerId);

        const data = {
          id: bookmaker.id,
          name: bookmaker.name,
          externalId: bookmaker.externalId?.toString() ?? null,
          createdAt: bookmaker.createdAt.toISOString(),
          updatedAt: bookmaker.updatedAt.toISOString(),
        };

        return reply.send({
          status: "success",
          data,
          message: "Bookmaker fetched from database successfully",
        });
      } catch (error: any) {
        if (error.statusCode === 404) {
          return reply.status(404).send({
            status: "error",
            message: error.message,
          });
        }
        throw error;
      }
    }
  );

  // GET /admin/db/bookmakers/search - Search bookmakers
  fastify.get<{ Reply: AdminBookmakersListResponse }>(
    "/bookmakers/search",
    {
      schema: {
        querystring: searchBookmakersQuerystringSchema,
        response: {
          200: searchBookmakersResponseSchema,
        },
      },
    },
    async (req, reply): Promise<AdminBookmakersListResponse> => {
      const query = req.query as {
        q: string;
        take?: number;
      };

      const take = query.take ?? 10;

      const bookmakers = await service.search(query.q, take);

      const data = bookmakers.map((b) => ({
        id: b.id,
        name: b.name,
        externalId: b.externalId?.toString() ?? null,
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
      }));

      return reply.send({
        status: "success",
        data,
        pagination: {
          page: 1,
          perPage: take,
          totalItems: data.length,
          totalPages: 1,
        },
        message: "Bookmakers search completed successfully",
      });
    }
  );
};

export default adminBookmakersDbRoutes;

