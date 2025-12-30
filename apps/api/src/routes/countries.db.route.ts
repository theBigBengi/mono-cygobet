// src/routes/admin/countries.db.route.ts
import { FastifyPluginAsync } from "fastify";
import { Prisma } from "@repo/db";
import { CountriesService } from "../services/countries.service";
import { AdminCountriesListResponse, AdminCountryResponse } from "@repo/types";

const adminCountriesDbRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new CountriesService(fastify);

  // GET /admin/countries/db - List countries from database
  fastify.get<{ Reply: AdminCountriesListResponse }>(
    "/admin/countries/db",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            page: { type: "number", default: 1 },
            perPage: { type: "number", default: 20 },
            active: { type: "boolean" },
            include: { type: "string" }, // e.g., "leagues,teams"
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              status: { type: "string" },
              data: { type: "array", items: { type: "object" } },
              pagination: { type: "object" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    async (req, reply): Promise<AdminCountriesListResponse> => {
      const query = req.query as {
        page?: number;
        perPage?: number;
        active?: boolean;
        include?: string;
      };

      const page = query.page ?? 1;
      const perPage = query.perPage ?? 20;
      const skip = (page - 1) * perPage;
      const take = perPage;

      // Parse include string to Prisma include object
      let include: Prisma.countriesInclude | undefined = undefined;
      if (query.include) {
        include = {} as Prisma.countriesInclude;
        const includes = query.include.split(",");
        includes.forEach((inc) => {
          const key = inc.trim() as keyof Prisma.countriesInclude;
          if (key === "leagues" || key === "teams") {
            (include as any)[key] = true;
          }
        });
      }

      const { countries, count } = await service.get({
        take,
        skip,
        active: query.active,
        orderBy: [{ name: "asc" }],
        include,
      });

      return reply.send({
        status: "success",
        data: countries.map((c) => ({
          id: c.id,
          name: c.name,
          iso2: c.iso2,
          iso3: c.iso3,
          imagePath: c.imagePath,
          active: c.active,
          externalId: c.externalId.toString(),
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
        })),
        pagination: {
          page,
          perPage,
          totalItems: count,
          totalPages: Math.ceil(count / perPage),
        },
        message: "Countries fetched successfully",
      });
    }
  );

  // GET /admin/countries/db/:id - Get country by ID from database
  fastify.get<{ Params: { id: string }; Reply: AdminCountryResponse }>(
    "/admin/countries/db/:id",
    {
      schema: {
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
          required: ["id"],
        },
        querystring: {
          type: "object",
          properties: {
            include: { type: "string" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              status: { type: "string" },
              data: { type: "object" },
              message: { type: "string" },
            },
          },
          404: {
            type: "object",
            properties: {
              status: { type: "string" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    async (req, reply): Promise<AdminCountryResponse> => {
      const { id } = req.params;
      const { include } = req.query as { include?: string };

      const countryId = parseInt(id, 10);
      if (isNaN(countryId)) {
        return reply.code(400).send({
          status: "error",
          message: "Invalid country ID",
        } as any);
      }

      // Parse include string to Prisma include object
      let includeObj: Prisma.countriesInclude | undefined = undefined;
      if (include) {
        includeObj = {} as Prisma.countriesInclude;
        const includes = include.split(",");
        includes.forEach((inc) => {
          const key = inc.trim() as keyof Prisma.countriesInclude;
          if (key === "leagues" || key === "teams") {
            (includeObj as any)[key] = true;
          }
        });
      }

      const country = await service.getById(countryId, includeObj);

      return reply.send({
        status: "success",
        data: {
          id: country.id,
          name: country.name,
          iso2: country.iso2,
          iso3: country.iso3,
          imagePath: country.imagePath,
          active: country.active,
          externalId: country.externalId.toString(),
          createdAt: country.createdAt.toISOString(),
          updatedAt: country.updatedAt.toISOString(),
        },
        message: "Country fetched successfully",
      });
    }
  );

  // GET /admin/countries/db/search - Search countries in database
  fastify.get<{ Reply: AdminCountriesListResponse }>(
    "/admin/countries/db/search",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            q: { type: "string" },
            take: { type: "number", default: 10 },
          },
          required: ["q"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              status: { type: "string" },
              data: { type: "array", items: { type: "object" } },
              pagination: { type: "object" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    async (req, reply): Promise<AdminCountriesListResponse> => {
      const { q, take } = req.query as { q: string; take?: number };

      const countries = await service.search(q, take || 10);

      return reply.send({
        status: "success",
        data: countries.map((c) => ({
          id: c.id,
          name: c.name,
          iso2: c.iso2,
          iso3: c.iso3,
          imagePath: c.imagePath,
          active: c.active,
          externalId: c.externalId.toString(),
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
        })),
        pagination: {
          page: 1,
          perPage: countries.length,
          totalItems: countries.length,
          totalPages: 1,
        },
        message: "Countries search completed",
      });
    }
  );
};

export default adminCountriesDbRoutes;
