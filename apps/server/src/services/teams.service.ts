// src/services/teams.service.ts
import type { FastifyInstance } from "fastify";
import { Prisma, prisma } from "@repo/db";
import { NotFoundError } from "../utils/errors";

export class TeamsService {
  constructor(private fastify: FastifyInstance) {}

  async get(args: {
    take: number;
    skip: number;
    countryId?: number;
    type?: string;
    orderBy?: Prisma.teamsOrderByWithRelationInput[];
    include?: Prisma.teamsInclude;
  }) {
    const orderBy = (
      args.orderBy?.length ? args.orderBy : [{ name: "asc" }]
    ) as Prisma.teamsOrderByWithRelationInput[];

    const where: Prisma.teamsWhereInput = {};

    if (args.countryId !== undefined) {
      where.countryId = args.countryId;
    }

    if (args.type !== undefined) {
      where.type = args.type;
    }

    const findManyArgs: Prisma.teamsFindManyArgs = {
      where,
      include: args.include || {
        countries: {
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
      orderBy,
      take: args.take,
      skip: args.skip,
    };

    const [teams, count] = await Promise.all([
      prisma.teams.findMany(findManyArgs),
      prisma.teams.count({ where }),
    ]);

    return { teams, count };
  }

  async getById(id: number, include?: Prisma.teamsInclude) {
    const team = await prisma.teams.findUnique({
      where: { id },
      include: include || {
        countries: true,
      },
    });

    if (!team) {
      throw new NotFoundError(`Team with id ${id} not found`);
    }

    return team;
  }

  async getByExternalId(
    externalId: number | bigint,
    include?: Prisma.teamsInclude
  ) {
    const team = await prisma.teams.findUnique({
      where: {
        externalId:
          typeof externalId === "bigint" ? externalId : BigInt(externalId),
      },
      include: include || {
        countries: true,
      },
    });

    if (!team) {
      throw new NotFoundError(`Team with external id ${externalId} not found`);
    }

    return team;
  }

  async search(query: string, take: number = 10) {
    const teams = await prisma.teams.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { shortCode: { contains: query, mode: "insensitive" } },
        ],
      },
      take,
      orderBy: { name: "asc" },
      include: {
        countries: true,
      },
    });

    return teams;
  }
}
