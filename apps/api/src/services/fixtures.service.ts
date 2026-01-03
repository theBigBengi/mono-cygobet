// src/services/fixtures.service.ts
import type { FastifyInstance } from "fastify";
import { Prisma, prisma } from "@repo/db";
import { NotFoundError } from "../utils/errors";

export class FixturesService {
  constructor(private fastify: FastifyInstance) {}

  async get(args: {
    take: number;
    skip: number;
    leagueId?: number;
    leagueIds?: number[];
    countryIds?: number[];
    seasonId?: number;
    state?: string;
    fromTs?: number;
    toTs?: number;
    orderBy?: Prisma.fixturesOrderByWithRelationInput[];
    include?: Prisma.fixturesInclude;
  }) {
    const orderBy = (
      args.orderBy?.length ? args.orderBy : [{ startTs: "desc" }]
    ) as Prisma.fixturesOrderByWithRelationInput[];

    const where: Prisma.fixturesWhereInput = {};

    if (args.leagueId !== undefined) {
      where.leagueId = args.leagueId;
    }

    if (args.leagueIds && args.leagueIds.length > 0) {
      where.leagueId = { in: args.leagueIds };
    }

    if (args.countryIds && args.countryIds.length > 0) {
      where.league = {
        countryId: { in: args.countryIds },
      };
    }

    if (args.seasonId !== undefined) {
      where.seasonId = args.seasonId;
    }

    if (args.state !== undefined) {
      where.state = args.state as any;
    }

    // Date range filtering by startTs
    if (args.fromTs !== undefined || args.toTs !== undefined) {
      where.startTs = {};
      if (args.fromTs !== undefined) {
        where.startTs.gte = args.fromTs;
      }
      if (args.toTs !== undefined) {
        where.startTs.lte = args.toTs;
      }
    }

    const findManyArgs: Prisma.fixturesFindManyArgs = {
      where,
      include: args.include,
      orderBy,
      take: args.take,
      skip: args.skip,
    };

    const [fixtures, count] = await Promise.all([
      prisma.fixtures.findMany(findManyArgs),
      prisma.fixtures.count({ where }),
    ]);

    return { fixtures, count };
  }

  async getById(id: number, include?: Prisma.fixturesInclude) {
    const fixture = await prisma.fixtures.findUnique({
      where: { id },
      include,
    });

    if (!fixture) {
      throw new NotFoundError(`Fixture with id ${id} not found`);
    }

    return fixture;
  }

  async getByExternalId(
    externalId: number | bigint,
    include?: Prisma.fixturesInclude
  ) {
    const fixture = await prisma.fixtures.findUnique({
      where: {
        externalId:
          typeof externalId === "bigint" ? externalId : BigInt(externalId),
      },
      include,
    });

    if (!fixture) {
      throw new NotFoundError(
        `Fixture with external id ${externalId} not found`
      );
    }

    return fixture;
  }

  async search(query: string, take: number = 10) {
    const fixtures = await prisma.fixtures.findMany({
      where: {
        name: { contains: query, mode: "insensitive" },
      },
      take,
      orderBy: { startTs: "desc" },
    });

    return fixtures;
  }
}
