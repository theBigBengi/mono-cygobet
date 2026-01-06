// src/etl/seeds/seed.odds.ts
import type { OddsDTO } from "@repo/types/sport-data/common";
import {
  startSeedBatch,
  trackSeedItem,
  finishSeedBatch,
  chunk,
  safeBigInt,
} from "./seed.utils";
import { RunStatus, RunTrigger, prisma } from "@repo/db";

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

  console.log(`🎲 Starting odds seeding: ${odds.length} odds to process`);

  // O(n) deduplication using Set
  const seen = new Set<string>();
  const uniqueOdds: OddsDTO[] = [];
  const duplicates: OddsDTO[] = [];
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  try {
    console.log(
      `🚀 [${batchId}] Starting odds seeding with ${odds.length} items`
    );

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
      console.log(
        `⚠️ [${batchId}] Found ${duplicates.length} duplicate odds, processing ${uniqueOdds.length} unique items`
      );

      // Track skipped duplicates
      const duplicatePromises = duplicates.map((duplicate) =>
        trackSeedItem(
          batchId!,
          String(safeBigInt(duplicate.externalId)),
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
          String(safeBigInt(odd.externalId)),
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
          externalId: { in: uniqueFixtureIds.map((id) => safeBigInt(id)) },
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
          externalId: { in: uniqueBookmakerIds.map((id) => safeBigInt(id)) },
        },
        select: { id: true, externalId: true },
      });

      for (const bookmaker of bookmakers) {
        bookmakerMap.set(String(bookmaker.externalId), bookmaker.id);
      }
    }

    // Create missing bookmakers on the fly
    const missingBookmakerIds = uniqueBookmakerIds.filter(
      (id) => !bookmakerMap.has(id)
    );
    if (missingBookmakerIds.length > 0) {
      console.log(
        `ℹ️ [${batchId}] Creating ${missingBookmakerIds.length} missing bookmakers`
      );

      for (const bookmakerExternalId of missingBookmakerIds) {
        const anyOdd = uniqueOdds.find(
          (odd) => odd.bookmakerExternalId === Number(bookmakerExternalId)
        );
        const bookmakerName =
          anyOdd?.bookmakerName || `Bookmaker ${bookmakerExternalId}`;

        try {
          const newBookmaker = await prisma.bookmakers.upsert({
            where: { externalId: safeBigInt(bookmakerExternalId) },
            update: { name: bookmakerName },
            create: {
              externalId: safeBigInt(bookmakerExternalId),
              name: bookmakerName,
            },
          });
          bookmakerMap.set(bookmakerExternalId, newBookmaker.id);
        } catch (error) {
          console.log(
            `⚠️ [${batchId}] Failed to create bookmaker ${bookmakerExternalId}: ${error}`
          );
        }
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
      console.log(
        `📦 [${batchId}] Processing chunk ${i + 1}/${groups.length} (${
          group.length
        } items)`
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
          externalId: { in: group.map((o) => safeBigInt(o.externalId)) },
        },
        select: { externalId: true },
      });
      const existingSet = new Set(
        existingInChunk.map((r) => String(r.externalId))
      );

      for (const odd of group) {
        try {
          const extIdKey = String(safeBigInt(odd.externalId));
          const action: "insert" | "update" = existingSet.has(extIdKey)
            ? "update"
            : "insert";

          // Validate required fields
          if (!odd.name && !odd.label) {
            throw new Error("Odd must have either name or label");
          }
          if (odd.value == null || odd.value === "") {
            throw new Error("Odd value is required");
          }
          const valueNum =
            typeof odd.value === "number" ? odd.value : parseFloat(odd.value);
          if (!Number.isFinite(valueNum) || valueNum < 1) {
            throw new Error(
              `Odd value must be a valid number > 1, got: ${odd.value}`
            );
          }
          if (!odd.fixtureExternalId) {
            throw new Error("Fixture external ID is required");
          }
          if (odd.startingAtTs == null || !Number.isFinite(odd.startingAtTs)) {
            throw new Error(
              "startingAtTs (unix seconds) is required and must be finite"
            );
          }

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

          // Use Unix timestamp as source of truth (always UTC)
          // This avoids timezone parsing issues with ambiguous datetime strings like "2025-08-23 14:00:00"
          // The API's startingAt field is ambiguous (no timezone), so we derive it from the authoritative startingAtTs
          const startingAt = new Date(odd.startingAtTs * 1000).toISOString();

          // Use Prisma upsert to handle both create and update scenarios
          await prisma.odds.upsert({
            where: { externalId: safeBigInt(odd.externalId) },
            update: {
              fixtureId: fixtureId,
              bookmakerId: bookmakerId ?? undefined,
              marketExternalId: safeBigInt(odd.marketExternalId),
              marketDescription: odd.marketDescription,
              marketName: odd.marketName,
              sortOrder: odd.sortOrder,
              label: odd.label,
              name: odd.name ?? undefined,
              handicap: odd.handicap ?? undefined,
              total: odd.total ?? undefined,
              value: odd.value,
              probability: odd.probability ?? undefined,
              winning: odd.winning,
              startingAt: startingAt,
              startingAtTimestamp: odd.startingAtTs,
              updatedAt: new Date(),
            },
            create: {
              externalId: safeBigInt(odd.externalId),
              fixtureId: fixtureId,
              bookmakerId: bookmakerId ?? null,
              marketExternalId: safeBigInt(odd.marketExternalId),
              marketDescription: odd.marketDescription,
              marketName: odd.marketName,
              sortOrder: odd.sortOrder,
              label: odd.label,
              name: odd.name ?? null,
              handicap: odd.handicap ?? null,
              total: odd.total ?? null,
              value: odd.value,
              probability: odd.probability ?? null,
              winning: odd.winning,
              startingAt: startingAt,
              startingAtTimestamp: odd.startingAtTs,
            },
          });

          // Collect fixtures to flag as having odds (will batch update later)
          fixturesToFlag.add(fixtureId);

          chunkResults.push({ success: true, odd, action });
        } catch (e: any) {
          const extIdKey = String(safeBigInt(odd.externalId));
          const action: "insert" | "update" = existingSet.has(extIdKey)
            ? "update"
            : "insert";
          const errorCode = e?.code || "UNKNOWN_ERROR";
          const errorMessage = String(e?.message || "Unknown error").slice(
            0,
            500
          );
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
          String(safeBigInt(result.odd.externalId)),
          result.success ? RunStatus.success : RunStatus.failed,
          result.success
            ? undefined
            : (result.error || "Unknown error").slice(0, 500),
          {
            name: result.odd.name || result.odd.label || "Unknown",
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
        console.log(`⚠️ [${batchId}] Tracking failures: ${trackingFails}`);
      }

      // Update success/failure counts
      for (const result of chunkResults) {
        if (result.success) {
          ok++;
          if (result.action === "insert") inserted++;
          else updated++;
        } else {
          fail++;
          console.log(
            `❌ [${batchId}] Odd failed: ${
              result.odd.name || result.odd.label || "Unknown"
            } (ID: ${result.odd.externalId}) - ${result.error}`
          );
        }
      }

      console.log(`✅ [${batchId}] Chunk processing completed`);
    }

    // Batch update all fixtures to flag as having odds
    if (fixturesToFlag.size > 0) {
      console.log(
        `🏷️ [${batchId}] Updating ${fixturesToFlag.size} fixtures with hasOdds=true`
      );
      await Promise.allSettled(
        Array.from(fixturesToFlag).map((id) =>
          prisma.fixtures.update({
            where: { id },
            data: { hasOdds: true },
          })
        )
      );
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
        missingBookmakersCreated: missingBookmakerIds.length,
        inserted,
        updated,
        skipped,
      },
    });

    console.log(
      `🎉 [${batchId}] Odds seeding completed: ${ok} success, ${fail} failed, ${duplicates.length} duplicates skipped`
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
    console.error(`💥 [${batchId}] Odds seeding failed:`, error);

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
