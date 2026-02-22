/**
 * Sync layer for odds: incremental updates only.
 * When opts.batchId is provided, writes one seed_item per fixture (odds group).
 */
import type { OddsDTO } from "@repo/types/sport-data/common";
import type { Prisma } from "@repo/db";
import { RunStatus, prisma } from "@repo/db";
import {
  transformOddsDto,
  type OddsTransformResult,
} from "../transform/odds.transform";
import { trackSeedItem } from "../seeds/seed.utils";
import { chunk } from "../utils";
import { getLogger } from "../../logger";

const log = getLogger("SyncOdds");
const CHUNK_SIZE = 8;

export type SyncOddsResult = {
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  total: number;
};

type ExistingRow = {
  externalId: string;
  fixtureId: number;
  bookmakerId: number | null;
  marketExternalId: string;
  marketDescription: string;
  marketName: string;
  sortOrder: number;
  label: string;
  name: string | null;
  handicap: string | null;
  total: string | null;
  value: string;
  probability: string | null;
  winning: boolean;
  startingAt: string;
  startingAtTimestamp: number;
};

type ResolvedPayload = OddsTransformResult & {
  fixtureId: number;
  bookmakerId: number | null;
};

function isSameOdd(existing: ExistingRow, payload: ResolvedPayload): boolean {
  return (
    existing.fixtureId === payload.fixtureId &&
    existing.bookmakerId === payload.bookmakerId &&
    existing.marketExternalId === payload.marketExternalId &&
    existing.marketDescription === payload.marketDescription &&
    existing.marketName === payload.marketName &&
    existing.sortOrder === payload.sortOrder &&
    existing.label === payload.label &&
    existing.name === payload.name &&
    existing.handicap === payload.handicap &&
    existing.total === payload.total &&
    existing.value === payload.value &&
    existing.probability === payload.probability &&
    existing.winning === payload.winning &&
    existing.startingAt === payload.startingAt &&
    existing.startingAtTimestamp === payload.startingAtTimestamp
  );
}

/** Build create and update payloads for odds upsert (single source of truth for field list). */
function buildOddsUpsertArgs(
  payload: OddsTransformResult,
  resolvedPayload: ResolvedPayload
) {
  const create = {
    externalId: payload.externalId,
    fixtureId: resolvedPayload.fixtureId,
    bookmakerId: resolvedPayload.bookmakerId,
    marketExternalId: payload.marketExternalId,
    marketDescription: payload.marketDescription,
    marketName: payload.marketName,
    sortOrder: payload.sortOrder,
    label: payload.label,
    name: payload.name,
    handicap: payload.handicap,
    total: payload.total,
    value: payload.value,
    probability: payload.probability,
    winning: payload.winning,
    startingAt: payload.startingAt,
    startingAtTimestamp: payload.startingAtTimestamp,
  };
  const update = {
    fixtureId: resolvedPayload.fixtureId,
    bookmakerId: resolvedPayload.bookmakerId,
    marketExternalId: payload.marketExternalId,
    marketDescription: payload.marketDescription,
    marketName: payload.marketName,
    sortOrder: payload.sortOrder,
    label: payload.label,
    name: payload.name,
    handicap: payload.handicap,
    total: payload.total,
    value: payload.value,
    probability: payload.probability,
    winning: payload.winning,
    startingAt: payload.startingAt,
    startingAtTimestamp: payload.startingAtTimestamp,
    updatedAt: new Date(),
  };
  return { create, update };
}

type PerFixtureStats = {
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
};

/**
 * Sync odds: transform, resolve FKs, compare with DB, then insert/update/skip.
 * When opts.batchId is set (and not dryRun), writes one seed_item per fixture with meta (name, oddsCount, action, reason).
 */
export async function syncOdds(
  odds: OddsDTO[],
  opts?: { dryRun?: boolean; signal?: AbortSignal; batchId?: number }
): Promise<SyncOddsResult> {
  const dryRun = !!opts?.dryRun;
  const batchId = opts?.batchId;
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  const fixtureStats = new Map<string, PerFixtureStats>();

  if (!odds?.length) {
    return { inserted: 0, updated: 0, skipped: 0, failed: 0, total: 0 };
  }

  // Dedup by externalId (same key as seed.odds)
  const seen = new Set<string>();
  const uniqueOdds: OddsDTO[] = [];
  for (const o of odds) {
    const key = String(o.externalId);
    if (seen.has(key)) {
      skipped += 1;
      continue;
    }
    seen.add(key);
    uniqueOdds.push(o);
  }

  // Batch resolve fixtures
  const fixtureExternalIds = uniqueOdds
    .map((o) => o.fixtureExternalId)
    .filter((id) => id != null);
  const uniqueFixtureIds = [...new Set(fixtureExternalIds.map(String))];
  const fixtureMap = new Map<string, number>();
  if (uniqueFixtureIds.length > 0) {
    const fixtures = await prisma.fixtures.findMany({
      where: {
        externalId: { in: uniqueFixtureIds.map((id) => String(id)) },
      },
      select: { id: true, externalId: true },
    });
    for (const f of fixtures) {
      fixtureMap.set(String(f.externalId), f.id);
    }
  }

  // Batch resolve bookmakers (do not create missing)
  const bookmakerExternalIds = uniqueOdds
    .map((o) => o.bookmakerExternalId)
    .filter((id) => id != null);
  const uniqueBookmakerIds = [...new Set(bookmakerExternalIds.map(String))];
  const bookmakerMap = new Map<string, number>();
  if (uniqueBookmakerIds.length > 0) {
    const bookmakers = await prisma.bookmakers.findMany({
      where: {
        externalId: { in: uniqueBookmakerIds.map((id) => String(id)) },
      },
      select: { id: true, externalId: true },
    });
    for (const b of bookmakers) {
      bookmakerMap.set(String(b.externalId), b.id);
    }
  }

  const fixturesToFlag = new Set<number>();

  for (const group of chunk(uniqueOdds, CHUNK_SIZE)) {
    if (opts?.signal?.aborted) {
      log.warn("syncOdds aborted by signal");
      break;
    }
    const groupExternalIds = group.map((o) => String(o.externalId));
    const existingRows = await prisma.odds.findMany({
      where: { externalId: { in: groupExternalIds } },
      select: {
        externalId: true,
        fixtureId: true,
        bookmakerId: true,
        marketExternalId: true,
        marketDescription: true,
        marketName: true,
        sortOrder: true,
        label: true,
        name: true,
        handicap: true,
        total: true,
        value: true,
        probability: true,
        winning: true,
        startingAt: true,
        startingAtTimestamp: true,
      },
    });
    const existingByExtId = new Map(
      existingRows.map((r) => [String(r.externalId), r as ExistingRow])
    );

    const results = await Promise.allSettled(
      group.map(async (odd) => {
        const extIdKey = String(odd.externalId);

        // Bookmaker required but not in DB -> do not create; fail this odd
        if (
          odd.bookmakerExternalId != null &&
          !bookmakerMap.has(String(odd.bookmakerExternalId))
        ) {
          log.warn(
            { externalId: odd.externalId, bookmakerExternalId: odd.bookmakerExternalId },
            "Bookmaker not found; skipping odd (sync does not create bookmakers)"
          );
          throw new Error(
            `Bookmaker not found (externalId: ${odd.bookmakerExternalId})`
          );
        }

        const fixtureId = fixtureMap.get(String(odd.fixtureExternalId));
        if (!fixtureId) {
          throw new Error(
            `Fixture not found (externalId: ${odd.fixtureExternalId})`
          );
        }

        const bookmakerId =
          odd.bookmakerExternalId != null
            ? bookmakerMap.get(String(odd.bookmakerExternalId)) ?? null
            : null;

        const payload = transformOddsDto(odd);
        const resolvedPayload: ResolvedPayload = {
          ...payload,
          fixtureId,
          bookmakerId,
        };

        const existing = existingByExtId.get(extIdKey);

        const upsertArgs = buildOddsUpsertArgs(payload, resolvedPayload);

        if (!existing) {
          if (!dryRun) {
            await prisma.odds.upsert({
              where: { externalId: payload.externalId },
              create: upsertArgs.create,
              update: upsertArgs.update,
            });
          }
          fixturesToFlag.add(fixtureId);
          return "inserted" as const;
        }

        if (isSameOdd(existing, resolvedPayload)) {
          return "skipped" as const;
        }

        if (!dryRun) {
          await prisma.odds.upsert({
            where: { externalId: payload.externalId },
            create: upsertArgs.create,
            update: upsertArgs.update,
          });
        }
        fixturesToFlag.add(fixtureId);
        return "updated" as const;
      })
    );

    for (let i = 0; i < results.length; i++) {
      const r = results[i]!;
      const odd = group[i]!;
      const extKey = String(odd.fixtureExternalId);
      if (!fixtureStats.has(extKey)) {
        fixtureStats.set(extKey, { inserted: 0, updated: 0, skipped: 0, failed: 0 });
      }
      const stats = fixtureStats.get(extKey)!;
      if (r.status === "fulfilled") {
        switch (r.value) {
          case "inserted":
            inserted += 1;
            stats.inserted += 1;
            break;
          case "updated":
            updated += 1;
            stats.updated += 1;
            break;
          case "skipped":
            skipped += 1;
            stats.skipped += 1;
            break;
        }
      } else {
        log.warn(
          { externalId: odd.externalId, reason: r.reason },
          "Odd sync failed (Promise rejected)"
        );
        failed += 1;
        stats.failed += 1;
      }
    }
  }

  // Post-process: flag fixtures as having odds (single query, like seed.odds)
  if (fixturesToFlag.size > 0 && !dryRun) {
    await prisma.fixtures.updateMany({
      where: { id: { in: Array.from(fixturesToFlag) } },
      data: { hasOdds: true },
    });
  }

  if (batchId && !dryRun && fixtureStats.size > 0) {
    const fixtureExternalIds = Array.from(fixtureStats.keys());
    const fixtures = await prisma.fixtures.findMany({
      where: { externalId: { in: fixtureExternalIds } },
      select: { id: true, externalId: true, name: true },
    });
    for (const fixture of fixtures) {
      const extKey = String(fixture.externalId);
      const stats = fixtureStats.get(extKey);
      if (!stats) continue;
      const oddsCount =
        stats.inserted + stats.updated + stats.skipped + stats.failed;
      const action =
        stats.updated > 0
          ? "updated"
          : stats.inserted > 0
            ? "inserted"
            : "skipped";
      const reason =
        stats.failed > 0
          ? "partial-failure"
          : stats.skipped === oddsCount
            ? "no-change"
            : undefined;
      const status =
        stats.failed > 0 ? RunStatus.failed : RunStatus.success;
      const meta: Prisma.InputJsonObject = {
        name: fixture.name,
        oddsCount,
        inserted: stats.inserted,
        updated: stats.updated,
        skipped: stats.skipped,
        failed: stats.failed,
        action,
        ...(reason ? { reason } : {}),
      };
      await trackSeedItem(
        batchId,
        `fixture:${fixture.externalId}`,
        status,
        undefined,
        meta
      );
    }
  }

  return {
    inserted,
    updated,
    skipped,
    failed,
    total: inserted + updated + skipped + failed,
  };
}
