// src/etl/seeds/seed.bookmakers.ts
import type { BookmakerDTO } from "@repo/types/sport-data/common";
import { startSeedBatch, trackSeedItem, finishSeedBatch } from "./seed.utils";
import { RunStatus, RunTrigger, prisma } from "@repo/db";

/**
 * Seeds bookmakers into the database using Prisma upsert operations.
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
  let batchId = opts?.batchId;

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
  }

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
    if (opts?.dryRun) {
      const promises = bookmakers.map((bookmaker) =>
        trackSeedItem(
          batchId!,
          String(bookmaker.externalId),
          RunStatus.skipped,
          undefined,
          {
            name: bookmaker.name,
            reason: "dryRun",
          }
        )
      );
      await Promise.allSettled(promises);
      await finishSeedBatch(batchId!, RunStatus.success, {
        itemsTotal: bookmakers.length,
        itemsSuccess: 0,
        itemsFailed: 0,
        meta: { dryRun: true },
      });
      return { batchId, ok: 0, fail: 0, total: bookmakers.length };
    }

    let ok = 0;
    let fail = 0;

    for (const bookmaker of bookmakers) {
      try {
        await prisma.bookmakers.upsert({
          where: { name: bookmaker.name },
          update: {},
          create: {
            name: bookmaker.name,
            externalId: bookmaker.externalId
              ? BigInt(bookmaker.externalId)
              : null,
          },
        });

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
      } catch (error: any) {
        const errorCode = error?.code || "UNKNOWN_ERROR";
        const errorMessage = String(error?.message || "Unknown error").slice(
          0,
          500
        );

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

