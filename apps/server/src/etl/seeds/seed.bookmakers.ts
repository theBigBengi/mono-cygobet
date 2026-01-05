// src/etl/seeds/seed.bookmakers.ts
import type { BookmakerDTO } from "@repo/types/sport-data/common";
import {
  startSeedBatch,
  trackSeedItem,
  finishSeedBatch,
  safeBigInt,
} from "./seed.utils";
import { RunStatus, RunTrigger, prisma } from "@repo/db";

/**
 * Seeds bookmakers.
 * Assumptions:
 *  - bookmakers(name) has a UNIQUE constraint
 *  - bookmakers(externalId) has a UNIQUE constraint
 */
export async function seedBookmakers(
  bookmakers: BookmakerDTO[],
  opts?: {
    batchId?: number;
    version?: string;
    trigger?: RunTrigger;
    triggeredBy?: string | null;
    triggeredById?: string | null;
    dryRun?: boolean;
  }
) {
  // In dry-run mode, skip all database writes including batch tracking
  if (opts?.dryRun) {
    console.log(
      `🧪 DRY RUN MODE: ${bookmakers?.length ?? 0} bookmakers would be processed (no database changes)`
    );
    return { batchId: null, ok: 0, fail: 0, total: bookmakers?.length ?? 0 };
  }

  let batchId = opts?.batchId;
  let createdHere = false;

  if (!batchId) {
    const started = await startSeedBatch(
      "seed-bookmakers",
      opts?.version ?? "v1",
      { totalInput: bookmakers?.length ?? 0, dryRun: !!opts?.dryRun },
      {
        trigger: opts?.trigger ?? RunTrigger.manual,
        triggeredBy: opts?.triggeredBy ?? null,
        triggeredById: opts?.triggeredById ?? null,
      }
    );
    batchId = started.id;
    createdHere = true;
  }

  // Short-circuit: no input
  if (!bookmakers?.length) {
    await finishSeedBatch(batchId!, RunStatus.success, {
      itemsTotal: 0,
      itemsSuccess: 0,
      itemsFailed: 0,
      meta: { reason: "no-input" },
    });
    return { batchId, ok: 0, fail: 0, total: 0 };
  }

  console.log(
    `🎰 Starting bookmakers seeding: ${bookmakers.length} bookmakers to process`
  );

  try {
    console.log(
      `🚀 [${batchId}] Starting bookmakers seeding with ${bookmakers.length} items`
    );

    let ok = 0;
    let fail = 0;

    // Upsert each bookmaker
    for (const bookmaker of bookmakers) {
      try {
        // Use Prisma upsert to handle both create and update scenarios
        await prisma.bookmakers.upsert({
          where: { externalId: safeBigInt(bookmaker.externalId) },
          update: {
            name: bookmaker.name,
            updatedAt: new Date(),
          },
          create: {
            name: bookmaker.name,
            externalId: safeBigInt(bookmaker.externalId),
          },
        });

        // Track successful seeding
        await trackSeedItem(
          batchId!,
          String(bookmaker.externalId),
          RunStatus.success,
          undefined,
          {
            name: bookmaker.name,
            externalId: bookmaker.externalId,
          }
        );

        ok++;
        console.log(
          `✅ [${batchId}] Bookmaker seeded/updated: ${bookmaker.name} (${bookmaker.externalId})`
        );
      } catch (error: any) {
        const errorCode = error?.code || "UNKNOWN_ERROR";
        const errorMessage = String(error?.message || "Unknown error").slice(
          0,
          500
        );

        // Track failed seeding
        await trackSeedItem(
          batchId!,
          String(bookmaker.externalId),
          RunStatus.failed,
          `[${errorCode}] ${errorMessage}`,
          {
            name: bookmaker.name,
            externalId: bookmaker.externalId,
            errorCode,
            errorMessage: errorMessage.slice(0, 200),
          }
        );

        fail++;
        console.log(
          `❌ [${batchId}] Bookmaker failed: ${bookmaker.name} (${bookmaker.externalId}) - ${errorMessage}`
        );
      }
    }

    // Finalize the batch
    await finishSeedBatch(batchId!, RunStatus.success, {
      itemsTotal: bookmakers.length,
      itemsSuccess: ok,
      itemsFailed: fail,
      meta: {
        bookmakers: bookmakers.map((b) => b.name),
      },
    });

    console.log(
      `🎉 [${batchId}] Bookmakers seeding completed: ${ok} success, ${fail} failed`
    );
    return { batchId, ok, fail, total: ok + fail };
  } catch (error) {
    console.error(`💥 [${batchId}] Bookmakers seeding failed:`, error);

    await finishSeedBatch(batchId!, RunStatus.failed, {
      itemsTotal: bookmakers.length,
      itemsSuccess: 0,
      itemsFailed: bookmakers.length,
      meta: { error: String(error).slice(0, 500) },
    });

    return {
      batchId,
      ok: 0,
      fail: bookmakers.length,
      total: bookmakers.length,
    };
  }
}
