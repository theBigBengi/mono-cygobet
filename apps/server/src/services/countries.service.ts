// src/services/countries.service.ts
import type { FastifyInstance } from "fastify";
import { Prisma, prisma } from "@repo/db";
import { NotFoundError, BadRequestError } from "../utils/errors";

export class CountriesService {
  constructor(private fastify: FastifyInstance) {}

  async get(args: {
    take: number;
    skip: number;
    active?: boolean;
    orderBy?: Prisma.countriesOrderByWithRelationInput[];
    include?: Prisma.countriesInclude;
  }) {
    const orderBy = (
      args.orderBy?.length ? args.orderBy : [{ name: "asc" }]
    ) as Prisma.countriesOrderByWithRelationInput[];

    const where: Prisma.countriesWhereInput = {};

    if (args.active !== undefined) {
      where.active = args.active;
    }

    const findManyArgs: Prisma.countriesFindManyArgs = {
      where,
      include: args.include || {
        leagues: {
          take: 5,
          orderBy: { name: "asc" },
        },
        teams: {
          take: 5,
          orderBy: { name: "asc" },
        },
      },
      orderBy,
      take: args.take,
      skip: args.skip,
    };

    const [countries, count] = await Promise.all([
      prisma.countries.findMany(findManyArgs),
      prisma.countries.count({ where }),
    ]);

    return { countries, count };
  }

  async getById(id: number, include?: Prisma.countriesInclude) {
    const country = await prisma.countries.findUnique({
      where: { id },
      include: include || {
        leagues: {
          orderBy: { name: "asc" },
        },
        teams: {
          orderBy: { name: "asc" },
        },
      },
    });

    if (!country) {
      throw new NotFoundError(`Country with id ${id} not found`);
    }

    return country;
  }

  async getByExternalId(
    externalId: string | number,
    include?: Prisma.countriesInclude
  ) {
    const country = await prisma.countries.findUnique({
      where: {
        externalId: String(externalId),
      },
      include: include || {
        leagues: {
          orderBy: { name: "asc" },
        },
        teams: {
          orderBy: { name: "asc" },
        },
      },
    });

    if (!country) {
      throw new NotFoundError(
        `Country with external id ${externalId} not found`
      );
    }

    return country;
  }

  async search(query: string, take: number = 10) {
    const countries = await prisma.countries.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { iso2: { contains: query, mode: "insensitive" } },
          { iso3: { contains: query, mode: "insensitive" } },
        ],
      },
      take,
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            leagues: true,
            teams: true,
          },
        },
      },
    });

    return countries;
  }
}
