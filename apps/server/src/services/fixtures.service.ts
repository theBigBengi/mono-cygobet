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

    const where: Prisma.fixturesWhereInput = { externalId: { gte: 0 } };

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
      result?: string | null;
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
        result: true,
      },
    });
    if (!current) {
      throw new NotFoundError(`Fixture with id ${id} not found`);
    }

    const updateData: Prisma.fixturesUpdateInput = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.state !== undefined) {
      updateData.state = data.state as any;
    }

    if (data.homeScore90 !== undefined) {
      updateData.homeScore90 = data.homeScore90;
    }

    if (data.awayScore90 !== undefined) {
      updateData.awayScore90 = data.awayScore90;
    }

    if (data.result !== undefined) {
      updateData.result = data.result;
    }

    const isScoreOrStateOverride =
      data.homeScore90 !== undefined ||
      data.awayScore90 !== undefined ||
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
    if (data.name !== undefined && toStr(current.name) !== toStr(data.name)) {
      auditChanges.name = { old: toStr(current.name), new: toStr(data.name) };
    }
    if (
      data.state !== undefined &&
      toStr(current.state) !== toStr(data.state)
    ) {
      auditChanges.state = {
        old: toStr(current.state),
        new: toStr(data.state),
      };
    }
    if (
      data.homeScore90 !== undefined &&
      toStr(current.homeScore90) !== toStr(data.homeScore90)
    ) {
      auditChanges.homeScore90 = {
        old: toStr(current.homeScore90),
        new: toStr(data.homeScore90),
      };
    }
    if (
      data.awayScore90 !== undefined &&
      toStr(current.awayScore90) !== toStr(data.awayScore90)
    ) {
      auditChanges.awayScore90 = {
        old: toStr(current.awayScore90),
        new: toStr(data.awayScore90),
      };
    }
    if (
      data.result !== undefined &&
      toStr(current.result) !== toStr(data.result)
    ) {
      auditChanges.result = {
        old: toStr(current.result),
        new: toStr(data.result),
      };
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
