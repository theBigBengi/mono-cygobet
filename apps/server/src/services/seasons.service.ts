// src/services/seasons.service.ts
import type { FastifyInstance } from "fastify";
import { Prisma, prisma } from "@repo/db";
import { NotFoundError } from "../utils/errors";

export class SeasonsService {
  constructor(private fastify: FastifyInstance) {}

  async get(args: {
    take: number;
    skip: number;
    leagueId?: number;
    isCurrent?: boolean;
    orderBy?: Prisma.seasonsOrderByWithRelationInput[];
    include?: Prisma.seasonsInclude;
  }) {
    const orderBy = (
      args.orderBy?.length ? args.orderBy : [{ name: "asc" }]
    ) as Prisma.seasonsOrderByWithRelationInput[];

    const where: Prisma.seasonsWhereInput = {};

    if (args.leagueId !== undefined) {
      where.leagueId = args.leagueId;
    }

    if (args.isCurrent !== undefined) {
      where.isCurrent = args.isCurrent;
    }

    const findManyArgs: Prisma.seasonsFindManyArgs = {
      where,
      include: args.include || {
        leagues: {
          select: {
            id: true,
            name: true,
            imagePath: true,
            type: true,
            externalId: true,
            country: {
              select: {
                id: true,
                name: true,
                imagePath: true,
                iso2: true,
                iso3: true,
                externalId: true,
              },
            },
          },
        },
      },
      orderBy,
      take: args.take,
      skip: args.skip,
    };

    const [seasons, count] = await Promise.all([
      prisma.seasons.findMany(findManyArgs),
      prisma.seasons.count({ where }),
    ]);

    return { seasons, count };
  }

  async getById(id: number, include?: Prisma.seasonsInclude) {
    const season = await prisma.seasons.findUnique({
      where: { id },
      include: include || {
        leagues: {
          select: {
            id: true,
            name: true,
            imagePath: true,
            type: true,
            externalId: true,
            country: {
              select: {
                id: true,
                name: true,
                imagePath: true,
                iso2: true,
                iso3: true,
                externalId: true,
              },
            },
          },
        },
      },
    });

    if (!season) {
      throw new NotFoundError(`Season with id ${id} not found`);
    }

    return season;
  }

  async getByExternalId(
    externalId: string | number,
    include?: Prisma.seasonsInclude
  ) {
    const season = await prisma.seasons.findUnique({
      where: {
        externalId: String(externalId),
      },
      include: include || {
        leagues: {
          select: {
            id: true,
            name: true,
            imagePath: true,
            type: true,
            externalId: true,
            country: {
              select: {
                id: true,
                name: true,
                imagePath: true,
                iso2: true,
                iso3: true,
                externalId: true,
              },
            },
          },
        },
      },
    });

    if (!season) {
      throw new NotFoundError(
        `Season with external id ${externalId} not found`
      );
    }

    return season;
  }

  async search(query: string, take: number = 10) {
    const seasons = await prisma.seasons.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
        ],
      },
      take,
      orderBy: { name: "asc" },
      include: {
        leagues: {
          select: {
            id: true,
            name: true,
            imagePath: true,
            type: true,
            externalId: true,
            country: {
              select: {
                id: true,
                name: true,
                imagePath: true,
                iso2: true,
                iso3: true,
                externalId: true,
              },
            },
          },
        },
      },
    });

    return seasons;
  }
}

