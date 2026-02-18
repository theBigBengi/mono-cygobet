// src/services/leagues.service.ts
import type { FastifyInstance } from "fastify";
import { Prisma, prisma } from "@repo/db";
import { NotFoundError } from "../utils/errors";

export class LeaguesService {
  constructor(private fastify: FastifyInstance) {}

  async get(args: {
    take: number;
    skip: number;
    countryId?: number;
    type?: string;
    where?: Prisma.leaguesWhereInput;
    orderBy?: Prisma.leaguesOrderByWithRelationInput[];
    include?: Prisma.leaguesInclude;
  }) {
    const orderBy = (
      args.orderBy?.length ? args.orderBy : [{ name: "asc" }]
    ) as Prisma.leaguesOrderByWithRelationInput[];

    // Use provided where or build from individual params
    const where: Prisma.leaguesWhereInput = args.where ?? {};

    if (!args.where) {
      if (args.countryId !== undefined) {
        where.countryId = args.countryId;
      }
      if (args.type !== undefined) {
        where.type = args.type;
      }
    }

    const findManyArgs: Prisma.leaguesFindManyArgs = {
      where,
      include: args.include || {
        country: true,
        seasons: {
          take: 5,
          orderBy: { name: "asc" },
        },
        fixtures: {
          take: 5,
          orderBy: { startTs: "desc" },
        },
      },
      orderBy,
      take: args.take,
      skip: args.skip,
    };

    const [leagues, count] = await Promise.all([
      prisma.leagues.findMany(findManyArgs),
      prisma.leagues.count({ where }),
    ]);

    return { leagues, count };
  }

  async getById(id: number, include?: Prisma.leaguesInclude) {
    const league = await prisma.leagues.findUnique({
      where: { id },
      include: include || {
        country: true,
        seasons: {
          orderBy: { name: "asc" },
        },
        fixtures: {
          take: 10,
          orderBy: { startTs: "desc" },
        },
      },
    });

    if (!league) {
      throw new NotFoundError(`League with id ${id} not found`);
    }

    return league;
  }

  async getByExternalId(
    externalId: number | bigint,
    include?: Prisma.leaguesInclude
  ) {
    const league = await prisma.leagues.findUnique({
      where: {
        externalId:
          typeof externalId === "bigint" ? externalId : BigInt(externalId),
      },
      include: include || {
        country: true,
        seasons: {
          orderBy: { name: "asc" },
        },
        fixtures: {
          take: 10,
          orderBy: { startTs: "desc" },
        },
      },
    });

    if (!league) {
      throw new NotFoundError(
        `League with external id ${externalId} not found`
      );
    }

    return league;
  }

  async search(query: string, take: number = 10) {
    const leagues = await prisma.leagues.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { shortCode: { contains: query, mode: "insensitive" } },
        ],
      },
      take,
      orderBy: { name: "asc" },
      include: {
        country: true,
        _count: {
          select: {
            seasons: true,
            fixtures: true,
          },
        },
      },
    });

    return leagues;
  }
}
