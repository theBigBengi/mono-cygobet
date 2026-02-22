// src/services/bookmakers.service.ts
import type { FastifyInstance } from "fastify";
import { Prisma, prisma } from "@repo/db";
import { NotFoundError } from "../utils/errors";

export class BookmakersService {
  constructor(private fastify: FastifyInstance) {}

  async get(args: {
    take: number;
    skip: number;
    orderBy?: Prisma.bookmakersOrderByWithRelationInput[];
  }) {
    const orderBy = (
      args.orderBy?.length ? args.orderBy : [{ name: "asc" }]
    ) as Prisma.bookmakersOrderByWithRelationInput[];

    const findManyArgs: Prisma.bookmakersFindManyArgs = {
      orderBy,
      take: args.take,
      skip: args.skip,
    };

    const [bookmakers, count] = await Promise.all([
      prisma.bookmakers.findMany(findManyArgs),
      prisma.bookmakers.count(),
    ]);

    return { bookmakers, count };
  }

  async getById(id: number) {
    const bookmaker = await prisma.bookmakers.findUnique({
      where: { id },
    });

    if (!bookmaker) {
      throw new NotFoundError(`Bookmaker with id ${id} not found`);
    }

    return bookmaker;
  }

  async getByExternalId(externalId: string | number) {
    const bookmaker = await prisma.bookmakers.findUnique({
      where: {
        externalId: String(externalId),
      },
    });

    if (!bookmaker) {
      throw new NotFoundError(
        `Bookmaker with external id ${externalId} not found`
      );
    }

    return bookmaker;
  }

  async search(query: string, take: number = 10) {
    const bookmakers = await prisma.bookmakers.findMany({
      where: {
        name: { contains: query, mode: "insensitive" },
      },
      take,
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            odds: true,
          },
        },
      },
    });

    return bookmakers;
  }
}

