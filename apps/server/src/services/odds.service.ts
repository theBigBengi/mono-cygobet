// src/services/odds.service.ts
import type { FastifyInstance } from "fastify";
import { Prisma, prisma } from "@repo/db";

export class OddsService {
  constructor(private fastify: FastifyInstance) {}

  async get(args: {
    take: number;
    skip: number;
    fixtureIds?: number[];
    bookmakerIds?: number[];
    marketIds?: number[];
    winning?: boolean;
    fromTs?: number;
    toTs?: number;
    include?: Prisma.oddsInclude;
    orderBy?: Prisma.oddsOrderByWithRelationInput[];
  }) {
    const where: Prisma.oddsWhereInput = {};

    if (args.fixtureIds?.length) {
      where.fixtureId = { in: args.fixtureIds };
    }
    if (args.bookmakerIds?.length) {
      where.bookmakerId = { in: args.bookmakerIds };
    }
    if (args.marketIds?.length) {
      where.marketExternalId = { in: args.marketIds.map((m) => String(m)) };
    }
    if (args.winning !== undefined) {
      where.winning = args.winning;
    }
    if (args.fromTs !== undefined || args.toTs !== undefined) {
      where.startingAtTimestamp = {};
      if (args.fromTs !== undefined) {
        (where.startingAtTimestamp as any).gte = args.fromTs;
      }
      if (args.toTs !== undefined) {
        (where.startingAtTimestamp as any).lte = args.toTs;
      }
    }

    const orderBy =
      (args.orderBy?.length ? args.orderBy : [{ startingAtTimestamp: "desc" }]) as
        | Prisma.oddsOrderByWithRelationInput[]
        | undefined;

    const findManyArgs: Prisma.oddsFindManyArgs = {
      where,
      include: args.include,
      orderBy,
      take: args.take,
      skip: args.skip,
    };

    const [odds, count] = await Promise.all([
      prisma.odds.findMany(findManyArgs),
      prisma.odds.count({ where }),
    ]);

    return { odds, count };
  }
}

