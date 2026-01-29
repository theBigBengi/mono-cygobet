// src/routes/admin/db/countries.route.ts
import { FastifyPluginAsync } from "fastify";
import { Prisma, prisma } from "@repo/db";
import { CountriesService } from "../../../../services/countries.service";
import { AdminCountriesListResponse, AdminCountryResponse } from "@repo/types";
import { getPagination, createPaginationResponse, parseId, parseIncludeString } from "../../../../utils/routes";
import {
  listCountriesQuerystringSchema,
  listCountriesResponseSchema,
  getCountryParamsSchema,
  getCountryQuerystringSchema,
  getCountryResponseSchema,
  getCountry404ResponseSchema,
  searchCountriesQuerystringSchema,
  searchCountriesResponseSchema,
} from "../../../../schemas/admin/countries.schemas";
import type {
  ListCountriesQuerystring,
  GetCountryQuerystring,
  GetCountryParams,
  SearchCountriesQuerystring,
} from "../../../../types";

const adminCountriesDbRoutes: FastifyPluginAsync = async (fastify) => {
  const service = new CountriesService(fastify);

  // GET /admin/countries/db - List countries from database
  fastify.get<{ Reply: AdminCountriesListResponse }>(
    "/countries",
    {
      schema: {
        querystring: listCountriesQuerystringSchema,
        response: {
          200: listCountriesResponseSchema,
        },
      },
    },
    async (req, reply): Promise<AdminCountriesListResponse> => {
      const query = req.query as ListCountriesQuerystring;
      const { page, perPage, skip, take } = getPagination(query);

      // Parse include string to Prisma include object
      const includeKeys = parseIncludeString(query.include);
      const include: Prisma.countriesInclude = {};
      includeKeys.forEach((key) => {
        if (key === "leagues" || key === "teams") {
          (include as any)[key] = true;
        }
      });

      // Always include leagues to count them
      const includeWithLeagues: Prisma.countriesInclude = {
        ...include,
        leagues: {
          select: { id: true },
        },
      };

      const { countries, count } = await service.get({
        take,
        skip,
        active: query.active,
        orderBy: [{ name: "asc" }],
        include: includeWithLeagues,
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
          leaguesCount: (c as any).leagues?.length || 0,
        })),
        pagination: createPaginationResponse(page, perPage, count),
        message: "Countries fetched successfully",
      });
    }
  );

  // GET /admin/countries/db/:id - Get country by ID from database
  fastify.get<{
    Params: GetCountryParams;
    Querystring: GetCountryQuerystring;
    Reply: AdminCountryResponse;
  }>(
    "/countries/:id",
    {
      schema: {
        params: getCountryParamsSchema,
        querystring: getCountryQuerystringSchema,
        response: {
          200: getCountryResponseSchema,
          404: getCountry404ResponseSchema,
        },
      },
    },
    async (req, reply): Promise<AdminCountryResponse> => {
      const { id } = req.params;
      const { include } = req.query;

      let countryId: number;
      try {
        countryId = parseId(id);
      } catch (error: any) {
        return reply.code(400).send({
          status: "error",
          message: error.message,
        } as any);
      }

      // Parse include string to Prisma include object
      const includeKeys = parseIncludeString(include);
      const includeObj: Prisma.countriesInclude = {};
      includeKeys.forEach((key) => {
        if (key === "leagues" || key === "teams") {
          (includeObj as any)[key] = true;
        }
      });

      // Always include leagues to count them
      const includeWithLeagues: Prisma.countriesInclude = {
        ...includeObj,
        leagues: {
          select: { id: true },
        },
      };

      const country = await service.getById(countryId, includeWithLeagues);

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
          leaguesCount: (country as any).leagues?.length || 0,
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
        querystring: searchCountriesQuerystringSchema,
        response: {
          200: searchCountriesResponseSchema,
        },
      },
    },
    async (req, reply): Promise<AdminCountriesListResponse> => {
      const { q, take } = req.query as SearchCountriesQuerystring;

      const countries = await service.search(q, take || 10);

      // Get leagues count for each country
      const countryIds = countries.map((c) => c.id);
      const leaguesByCountry = await prisma.leagues.groupBy({
        by: ["countryId"],
        where: {
          countryId: { in: countryIds },
        },
        _count: true,
      });
      const leaguesCountMap = new Map(
        leaguesByCountry.map((l) => [l.countryId, l._count])
      );

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
          leaguesCount: leaguesCountMap.get(c.id) || 0,
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

console.log("REGISTERING adminCountriesDbRoutes");
export default adminCountriesDbRoutes;
