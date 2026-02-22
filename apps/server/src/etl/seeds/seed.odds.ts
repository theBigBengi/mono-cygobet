// src/etl/seeds/seed.odds.ts
import type { OddsDTO } from "@repo/types/sport-data/common";
import {
  startSeedBatch,
  trackSeedItem,
  finishSeedBatch,
  chunk,
} from "./seed.utils";
import { RunStatus, RunTrigger, prisma } from "@repo/db";
import { transformOddsDto } from "../transform/odds.transform";
import { getErrorMessage, getErrorCode } from "../../utils/error.utils";
import { getLogger } from "../../logger";

const log = getLogger("SeedOdds");
const CHUNK_SIZE = 8;

export async function seedOdds(
  odds: OddsDTO[],
  opts?: {
    batchId?: number;
    version?: string;
    trigger?: RunTrigger;
    triggeredBy?: string | null;
    triggeredById?: string | null;
    dryRun?: boolean;
  }
): Promise<{
  batchId: number;
  ok: number;
  fail: number;
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  duplicates: number;
}> {
  // ---------- batch: reuse or create ----------
  let batchId = opts?.batchId;

  if (!batchId) {
    const started = await startSeedBatch(
      "seed-odds",
      opts?.version ?? "v1",
      { totalInput: odds?.length ?? 0, dryRun: !!opts?.dryRun },
      {
        trigger: opts?.trigger ?? RunTrigger.manual,
        triggeredBy: opts?.triggeredBy ?? null,
        triggeredById: opts?.triggeredById ?? null,
      }
    );
    batchId = started.id;
  }

  // ---------- short-circuit: no input ----------
  if (!odds?.length) {
    await finishSeedBatch(batchId!, RunStatus.success, {
      itemsTotal: 0,
      itemsSuccess: 0,
      itemsFailed: 0,
      meta: { reason: "no-input" },
    });
    return {
      batchId,
      ok: 0,
      fail: 0,
      total: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      duplicates: 0,
    };
  }

  log.info({ count: odds.length }, "Starting odds seeding");

  // O(n) deduplication using Set
  const seen = new Set<string>();
  const uniqueOdds: OddsDTO[] = [];
  const duplicates: OddsDTO[] = [];
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  try {
    log.info({ batchId, count: odds.length }, "Starting odds seeding batch");

    // O(n) deduplication using Set
    for (const odd of odds) {
      const key = String(odd.externalId);
      if (seen.has(key)) {
        duplicates.push(odd);
      } else {
        seen.add(key);
        uniqueOdds.push(odd);
      }
    }

    if (duplicates.length > 0) {
      log.warn(
        { batchId, duplicates: duplicates.length, unique: uniqueOdds.length },
        "Duplicate odds found"
      );

      // Track skipped duplicates
      const duplicatePromises = duplicates.map((duplicate) =>
        trackSeedItem(
          batchId!,
          String(duplicate.externalId),
          RunStatus.skipped,
          undefined,
          {
            name: duplicate.name || duplicate.label || "Unknown",
            reason: "duplicate",
            action: "skip",
          }
        )
      );
      await Promise.allSettled(duplicatePromises);
    }

    // Batch dry-run mode for speed
    if (opts?.dryRun) {
      const promises = uniqueOdds.map((odd) =>
        trackSeedItem(
          batchId!,
          String(odd.externalId),
          RunStatus.skipped,
          undefined,
          {
            name: odd.name || odd.label || "Unknown",
            reason: "dryRun",
            action: "dryRun",
          }
        )
      );
      await Promise.allSettled(promises);
      await finishSeedBatch(batchId!, RunStatus.success, {
        itemsTotal: uniqueOdds.length,
        itemsSuccess: 0,
        itemsFailed: 0,
        meta: {
          dryRun: true,
          inserted: 0,
          updated: 0,
          skipped: uniqueOdds.length,
          duplicates: duplicates.length,
        },
      });
      return {
        batchId,
        ok: 0,
        fail: 0,
        total: uniqueOdds.length,
        inserted: 0,
        updated: 0,
        skipped: uniqueOdds.length,
        duplicates: duplicates.length,
      };
    }

    // First, collect all unique external IDs and batch lookup relationships
    const fixtureExternalIds = uniqueOdds
      .map((odd) => odd.fixtureExternalId)
      .filter((id) => id != null);

    const bookmakerExternalIds = uniqueOdds
      .map((odd) => odd.bookmakerExternalId)
      .filter((id) => id != null);

    const uniqueFixtureIds = [...new Set(fixtureExternalIds.map(String))];
    const uniqueBookmakerIds = [...new Set(bookmakerExternalIds.map(String))];

    const fixtureMap = new Map<string, number>();
    const bookmakerMap = new Map<string, number>();

    // Batch lookup fixtures
    if (uniqueFixtureIds.length > 0) {
      const fixtures = await prisma.fixtures.findMany({
        where: {
          externalId: { in: uniqueFixtureIds },
        },
        select: { id: true, externalId: true },
      });

      for (const fixture of fixtures) {
        fixtureMap.set(String(fixture.externalId), fixture.id);
      }
    }

    // Batch lookup bookmakers
    if (uniqueBookmakerIds.length > 0) {
      const bookmakers = await prisma.bookmakers.findMany({
        where: {
          externalId: { in: uniqueBookmakerIds },
        },
        select: { id: true, externalId: true },
      });

      for (const bookmaker of bookmakers) {
        bookmakerMap.set(String(bookmaker.externalId), bookmaker.id);
      }
    }

    // Process odds in chunks
    const groups = chunk(uniqueOdds, CHUNK_SIZE);
    let ok = 0;
    let fail = 0;
    const fixturesToFlag = new Set<number>();

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      if (!group) continue;
      log.info(
        {
          batchId,
          chunk: i + 1,
          totalChunks: groups.length,
          size: group.length,
        },
        "Processing chunk"
      );

      const chunkResults: Array<{
        success: boolean;
        odd: OddsDTO;
        action: "insert" | "update";
        error?: string;
        errorCode?: string;
      }> = [];

      // Determine insert vs update for this chunk with one DB query.
      const existingInChunk = await prisma.odds.findMany({
        where: {
          externalId: { in: group.map((o) => String(o.externalId)) },
        },
        select: { externalId: true },
      });
      const existingSet = new Set(
        existingInChunk.map((r) => String(r.externalId))
      );

      for (const odd of group) {
        try {
          const extIdKey = String(odd.externalId);
          const action: "insert" | "update" = existingSet.has(extIdKey)
            ? "update"
            : "insert";

          if (
            odd.bookmakerExternalId != null &&
            !bookmakerMap.has(String(odd.bookmakerExternalId))
          ) {
            throw new Error(
              `Bookmaker not found (externalId: ${odd.bookmakerExternalId}). Sync bookmakers first.`
            );
          }

          const payload = transformOddsDto(odd);

          // Resolve relationship IDs from the pre-built maps
          const fixtureId = fixtureMap.get(String(odd.fixtureExternalId));
          if (!fixtureId) {
            throw new Error(
              `No valid fixture ID found for odd ${odd.externalId} (fixtureExternalId: ${odd.fixtureExternalId})`
            );
          }

          const bookmakerId =
            odd.bookmakerExternalId != null
              ? (bookmakerMap.get(String(odd.bookmakerExternalId)) ?? null)
              : null;

          // Use Prisma upsert to handle both create and update scenarios
          await prisma.odds.upsert({
            where: { externalId: payload.externalId },
            create: {
              externalId: payload.externalId,
              fixtureId,
              bookmakerId,
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
            },
            update: {
              fixtureId,
              bookmakerId,
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
            },
          });

          // Collect fixtures to flag as having odds (will batch update later)
          fixturesToFlag.add(fixtureId);

          chunkResults.push({ success: true, odd, action });
        } catch (e: unknown) {
          const extIdKey = String(odd.externalId);
          const action: "insert" | "update" = existingSet.has(extIdKey)
            ? "update"
            : "insert";
          const errorCode = getErrorCode(e);
          const errorMessage = getErrorMessage(e).slice(0, 500);
          chunkResults.push({
            success: false,
            odd,
            action,
            error: `[${errorCode}] ${errorMessage}`,
            errorCode,
          });
        }
      }

      // Process tracking for this chunk
      const trackingPromises = chunkResults.map((result) =>
        trackSeedItem(
          batchId!,
          String(result.odd.externalId),
          result.success ? RunStatus.success : RunStatus.failed,
          result.success
            ? undefined
            : (result.error || "Unknown error").slice(0, 500),
          {
            name: result.odd.name,
            label: result.odd.label,
            value: result.odd.value,
            startingAt: result.odd.startingAt,
            fixtureName: result.odd.fixtureName,
            fixtureExternalIds: result.odd.fixtureExternalId,
            externalId: result.odd.externalId,
            action: result.action,
            ...(result.success
              ? {}
              : {
                  errorCode: result.errorCode || "UNKNOWN_ERROR",
                  errorMessage: (result.error || "Unknown error").slice(0, 200),
                }),
          }
        )
      );

      // Wait for all tracking to complete and monitor failures
      const settled = await Promise.allSettled(trackingPromises);
      const trackingFails = settled.filter(
        (s) => s.status === "rejected"
      ).length;
      if (trackingFails > 0) {
        log.warn({ batchId, trackingFails }, "Seed item tracking failures");
      }

      // Update success/failure counts
      for (const result of chunkResults) {
        if (result.success) {
          ok++;
          if (result.action === "insert") inserted++;
          else updated++;
        } else {
          fail++;
          log.warn(
            { batchId, externalId: result.odd.externalId, error: result.error },
            "Odd seeding failed"
          );
        }
      }

      log.info({ batchId, chunk: i + 1 }, "Chunk completed");
    }

    // Batch update all fixtures to flag as having odds
    if (fixturesToFlag.size > 0) {
      log.info(
        { batchId, count: fixturesToFlag.size },
        "Flagging fixtures with hasOdds"
      );
      await prisma.fixtures.updateMany({
        where: { id: { in: Array.from(fixturesToFlag) } },
        data: { hasOdds: true },
      });
    }

    // Finalize the batch
    await finishSeedBatch(batchId!, RunStatus.success, {
      itemsTotal: uniqueOdds.length,
      itemsSuccess: ok,
      itemsFailed: fail,
        meta: {
          duplicates: duplicates.length,
          fixturesResolved: fixtureMap.size,
          bookmakersResolved: bookmakerMap.size,
          inserted,
          updated,
          skipped,
        },
    });

    log.info(
      { batchId, ok, fail, duplicates: duplicates.length },
      "Odds seeding completed"
    );
    return {
      batchId,
      ok,
      fail,
      total: ok + fail,
      inserted,
      updated,
      skipped,
      duplicates: duplicates.length,
    };
  } catch (error) {
    log.error({ batchId, err: error }, "Odds seeding failed");

    await finishSeedBatch(batchId!, RunStatus.failed, {
      itemsTotal: uniqueOdds.length,
      itemsSuccess: 0,
      itemsFailed: uniqueOdds.length,
      meta: {
        error: String(error).slice(0, 500),
        duplicates: duplicates.length,
        inserted,
        updated,
        skipped,
      },
    });

    return {
      batchId,
      ok: 0,
      fail: uniqueOdds.length,
      total: uniqueOdds.length,
      inserted,
      updated,
      skipped,
      duplicates: duplicates.length,
    };
  }
}
