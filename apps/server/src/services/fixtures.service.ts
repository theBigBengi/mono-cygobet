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
    dataQuality?: "noScores";
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
      const states = args.state
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (states.length === 1) {
        where.state = states[0] as any;
      } else if (states.length > 1) {
        where.state = { in: states as any[] };
      }
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

    // Data quality filters
    if (args.dataQuality === "noScores") {
      // Finished fixtures (FT, AET, FT_PEN) with missing scores
      where.state = { in: ["FT", "AET", "FT_PEN"] };
      where.OR = [{ homeScore90: null }, { awayScore90: null }];
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
    externalId: string | number,
    include?: Prisma.fixturesInclude
  ) {
    const fixture = await prisma.fixtures.findUnique({
      where: {
        externalId: String(externalId),
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

  /**
   * Update a fixture (admin override). Flow:
   * 1. Fetch current values so we can record what changed in the audit log.
   * 2. Build update payload from request data (name, state, scores, result, override metadata).
   * 3. Persist via prisma.fixtures.update.
   * 4. Compare old vs new for each field that was in the request; if any changed, write one row
   *    to fixture_audit_log with source "admin" and jobRunId null (visible in admin Timeline).
   */
  async update(
    id: number,
    data: {
      name?: string;
      state?: string;
      homeScore90?: number | null;
      awayScore90?: number | null;
      homeScoreET?: number | null;
      awayScoreET?: number | null;
      penHome?: number | null;
      penAway?: number | null;
      result?: string | null;
      leg?: string | null;
      /** When set, marks this update as a manual override (score/state) and records who did it. */
      overriddenById?: number | null;
    }
  ) {
    // Snapshot current values before update — used later to build audit diff and to throw if not found
    const current = await prisma.fixtures.findUnique({
      where: { id },
      select: {
        name: true,
        state: true,
        homeScore90: true,
        awayScore90: true,
        homeScoreET: true,
        awayScoreET: true,
        penHome: true,
        penAway: true,
        result: true,
        leg: true,
      },
    });
    if (!current) {
      throw new NotFoundError(`Fixture with id ${id} not found`);
    }

    const updateData: Prisma.fixturesUpdateInput = {};

    const simpleFields = [
      "name", "homeScore90", "awayScore90", "homeScoreET", "awayScoreET",
      "penHome", "penAway", "result", "leg",
    ] as const;
    for (const field of simpleFields) {
      if (data[field] !== undefined) {
        (updateData as any)[field] = data[field];
      }
    }

    if (data.state !== undefined) {
      updateData.state = data.state as any;
    }

    const isScoreOrStateOverride =
      data.homeScore90 !== undefined ||
      data.awayScore90 !== undefined ||
      data.homeScoreET !== undefined ||
      data.awayScoreET !== undefined ||
      data.penHome !== undefined ||
      data.penAway !== undefined ||
      data.state !== undefined ||
      data.result !== undefined;
    if (isScoreOrStateOverride) {
      updateData.scoreOverriddenAt = new Date();
      updateData.scoreOverriddenBy =
        data.overriddenById != null
          ? { connect: { id: data.overriddenById } }
          : { disconnect: true };
    }

    const fixture = await prisma.fixtures.update({
      where: { id },
      data: updateData,
      include: {
        scoreOverriddenBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Build audit diff: only fields that were in the request and actually changed (old !== new).
    // Same shape as job audit entries: Record<fieldName, { old, new }> so the Timeline can show "old → new".
    const toStr = (v: string | number | null | undefined): string =>
      v === null || v === undefined ? "null" : String(v);
    const auditChanges: Record<string, { old: string; new: string }> = {};
    const auditFields = [
      "name", "state", "homeScore90", "awayScore90", "homeScoreET", "awayScoreET",
      "penHome", "penAway", "result", "leg",
    ] as const;
    for (const field of auditFields) {
      if (data[field] !== undefined && toStr((current as any)[field]) !== toStr(data[field])) {
        auditChanges[field] = { old: toStr((current as any)[field]), new: toStr(data[field]) };
      }
    }
    // Write one audit row only when something actually changed; admin Timeline shows these as "admin" source
    if (Object.keys(auditChanges).length > 0) {
      await prisma.fixtureAuditLog.create({
        data: {
          fixtureId: id,
          jobRunId: null,
          source: "admin",
          changes: auditChanges,
        },
      });
    }

    return fixture;
  }
}
