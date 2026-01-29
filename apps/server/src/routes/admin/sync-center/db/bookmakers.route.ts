// src/routes/admin/db/bookmakers.route.ts
import { FastifyPluginAsync } from "fastify";
import { prisma } from "@repo/db";
import { BookmakersService } from "../../../../services/bookmakers.service";
import {
  AdminBookmakersListResponse,
  AdminBookmakerResponse,
} from "@repo/types";
import {
  getPagination,
  createPaginationResponse,
  parseId,
} from "../../../../utils/routes";
import {
  listBookmakersQuerystringSchema,
  listBookmakersResponseSchema,
  getBookmakerParamsSchema,
  getBookmakerResponseSchema,
  getBookmaker404ResponseSchema,
  searchBookmakersQuerystringSchema,
  searchBookmakersResponseSchema,
} from "../../../../schemas/admin/bookmakers.schemas";
import type {
  ListBookmakersQuerystring,
  GetBookmakerParams,
  SearchBookmakersQuerystring,
} from "../../../../types";

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
      const query = req.query as ListBookmakersQuerystring;

      const { page, perPage, skip, take } = getPagination(query);

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
        pagination: createPaginationResponse(page, perPage, count),
        message: "Bookmakers fetched from database successfully",
      });
    }
  );

  // GET /admin/db/bookmakers/:id - Get a single bookmaker by ID
  fastify.get<{ Params: GetBookmakerParams; Reply: AdminBookmakerResponse }>(
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
      let bookmakerId: number;
      try {
        bookmakerId = parseId(id);
      } catch (error: any) {
        return reply.code(400).send({
          status: "error",
          message: error.message,
        } as any);
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
        if ((error?.status ?? error?.statusCode) === 404) {
          return reply.code(404).send({
            status: "error",
            message: error.message,
          } as any);
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
      const query = req.query as SearchBookmakersQuerystring;

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
        pagination: createPaginationResponse(1, take, data.length),
        message: "Bookmakers search completed successfully",
      });
    }
  );
};

export default adminBookmakersDbRoutes;
