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
    where?: Prisma.teamsWhereInput;
    orderBy?: Prisma.teamsOrderByWithRelationInput[];
    include?: Prisma.teamsInclude;
  }) {
    const orderBy = (
      args.orderBy?.length ? args.orderBy : [{ name: "asc" }]
    ) as Prisma.teamsOrderByWithRelationInput[];

    // Use provided where or build from individual params
    const where: Prisma.teamsWhereInput = args.where ?? {};

    if (!args.where) {
      if (args.countryId !== undefined) {
        where.countryId = args.countryId;
      }
      if (args.type !== undefined) {
        where.type = args.type;
      }
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
    });

    return teams;
  }

  async update(
    id: number,
    data: {
      name?: string;
      shortCode?: string | null;
      primaryColor?: string | null;
      secondaryColor?: string | null;
      tertiaryColor?: string | null;
    }
  ) {
    const existing = await prisma.teams.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`Team with id ${id} not found`);
    }

    const prismaData: Parameters<typeof prisma.teams.update>[0]["data"] = {};
    if (data.name !== undefined) prismaData.name = data.name;
    if (data.shortCode !== undefined) prismaData.shortCode = data.shortCode;
    if (data.primaryColor !== undefined)
      prismaData.firstKitColor = data.primaryColor;
    if (data.secondaryColor !== undefined)
      prismaData.secondKitColor = data.secondaryColor;
    if (data.tertiaryColor !== undefined)
      prismaData.thirdKitColor = data.tertiaryColor;
    prismaData.updatedAt = new Date();

    const team = await prisma.teams.update({
      where: { id },
      data: prismaData,
      include: {
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
    });

    return team;
  }

  async bulkUpdateColors(
    teams: {
      name: string;
      primaryColor?: string | null;
      secondaryColor?: string | null;
      tertiaryColor?: string | null;
    }[]
  ) {
    // 1. Fetch ALL teams in ONE query (id, name, current colors for ?? preservation)
    const allTeams = await prisma.teams.findMany({
      select: {
        id: true,
        name: true,
        firstKitColor: true,
        secondKitColor: true,
        thirdKitColor: true,
      },
    });

    // 2. Case-insensitive name -> team map
    const teamMap = new Map<
      string,
      {
        id: number;
        firstKitColor: string | null;
        secondKitColor: string | null;
        thirdKitColor: string | null;
      }
    >();
    for (const t of allTeams) {
      teamMap.set(t.name.toLowerCase(), {
        id: t.id,
        firstKitColor: t.firstKitColor,
        secondKitColor: t.secondKitColor,
        thirdKitColor: t.thirdKitColor,
      });
    }

    const results = {
      updated: 0,
      notFound: [] as string[],
      errors: [] as { name: string; error: string }[],
    };

    const updates: {
      id: number;
      data: Parameters<typeof prisma.teams.update>[0]["data"];
    }[] = [];

    for (const team of teams) {
      const existing = teamMap.get(team.name.toLowerCase());
      if (!existing) {
        results.notFound.push(team.name);
        continue;
      }

      updates.push({
        id: existing.id,
        data: {
          firstKitColor: team.primaryColor ?? existing.firstKitColor,
          secondKitColor: team.secondaryColor ?? existing.secondKitColor,
          thirdKitColor: team.tertiaryColor ?? existing.thirdKitColor,
          updatedAt: new Date(),
        },
      });
    }

    // 4. Execute all updates in a single transaction
    try {
      await prisma.$transaction(
        updates.map((u) =>
          prisma.teams.update({
            where: { id: u.id },
            data: u.data,
          })
        )
      );
      results.updated = updates.length;
    } catch (error) {
      results.errors.push({
        name: "batch",
        error: error instanceof Error ? error.message : "Transaction failed",
      });
    }

    return results;
  }
}
