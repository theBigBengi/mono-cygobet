// src/etl/seeds/seed.bookmakers.ts
import type { BookmakerDTO } from "@repo/types/sport-data/common";
import {
  startSeedBatch,
  trackSeedItem,
  finishSeedBatch,
  chunk,
  safeBigInt,
  computeChanges,
} from "./seed.utils";
import { RunStatus, RunTrigger, prisma } from "@repo/db";
import { getLogger } from "../../logger";

const log = getLogger("SeedBookmakers");
const CHUNK_SIZE = 8;

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
    log.info(
      { count: bookmakers?.length ?? 0 },
      "Dry run mode; no DB changes"
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

  log.info(
    { count: bookmakers.length },
    "Starting bookmakers seeding"
  );

  // De-dupe input
  const seen = new Set<string>();
  const uniqueBookmakers: typeof bookmakers = [];
  const duplicates: typeof bookmakers = [];

  for (const bookmaker of bookmakers) {
    const key = String(bookmaker.externalId);
    if (seen.has(key)) {
      duplicates.push(bookmaker);
    } else {
      seen.add(key);
      uniqueBookmakers.push(bookmaker);
    }
  }

  if (duplicates.length > 0) {
    log.warn(
      { duplicates: duplicates.length, unique: uniqueBookmakers.length },
      "Input contained duplicate bookmakers; processing unique items"
    );
    const duplicatePromises = duplicates.map((bookmaker) =>
      trackSeedItem(
        batchId!,
        String(bookmaker.externalId),
        RunStatus.skipped,
        undefined,
        {
          entityType: "bookmaker",
          name: bookmaker.name,
          reason: "duplicate",
        }
      )
    );
    await Promise.allSettled(duplicatePromises);
  }

  // Pre-fetch which bookmakers already exist (with all tracked fields for change detection)
  const allExternalIds = uniqueBookmakers.map((b) => safeBigInt(b.externalId));
  const existingRows = await prisma.bookmakers.findMany({
    where: { externalId: { in: allExternalIds } },
    select: {
      externalId: true,
      name: true,
    },
  });
  const existingByExtId = new Map(
    existingRows.map((r) => [String(r.externalId), r])
  );
  const existingSet = new Set(existingRows.map((r) => String(r.externalId)));

  let ok = 0;
  let fail = 0;

  try {
    for (const group of chunk(uniqueBookmakers, CHUNK_SIZE)) {
      const chunkResults = await Promise.allSettled(
        group.map(async (bookmaker) => {
          const action = existingSet.has(String(bookmaker.externalId)) ? "updated" : "inserted";
          try {
            const updatePayload = {
              name: bookmaker.name,
              updatedAt: new Date(),
            };

            await prisma.bookmakers.upsert({
              where: { externalId: safeBigInt(bookmaker.externalId) },
              update: updatePayload,
              create: {
                name: bookmaker.name,
                externalId: safeBigInt(bookmaker.externalId),
              },
            });

            // Compute changes for update tracking
            const existing = existingByExtId.get(String(bookmaker.externalId));
            const changes = action === "updated"
              ? computeChanges(existing, updatePayload, ["name"])
              : null;

            await trackSeedItem(
              batchId!,
              String(bookmaker.externalId),
              RunStatus.success,
              undefined,
              {
                entityType: "bookmaker",
                name: bookmaker.name,
                externalId: bookmaker.externalId,
                action,
                ...(changes && { changes }),
              }
            );

            return { success: true, bookmaker, action };
          } catch (error: unknown) {
            const errorMessage = (error instanceof Error ? error.message : String(error)).slice(0, 500);
            const errorCode =
              error && typeof error === "object" && "code" in error
                ? String((error as { code?: string }).code)
                : "UNKNOWN_ERROR";

            const failedAction = action === "updated" ? "update_failed" : "insert_failed";

            await trackSeedItem(
              batchId!,
              String(bookmaker.externalId),
              RunStatus.failed,
              `[${errorCode}] ${errorMessage}`,
              {
                entityType: "bookmaker",
                name: bookmaker.name,
                externalId: bookmaker.externalId,
                errorCode,
                errorMessage: errorMessage.slice(0, 200),
                action: failedAction,
              }
            );

            log.error(
              { batchId, name: bookmaker.name, externalId: bookmaker.externalId, err: error },
              "Bookmaker failed"
            );

            return { success: false, bookmaker, error: errorMessage, action: failedAction };
          }
        })
      );

      for (const result of chunkResults) {
        if (result.status === "fulfilled") {
          if (result.value.success) {
            ok++;
          } else {
            fail++;
          }
        } else {
          fail++;
        }
      }
    }

    await finishSeedBatch(batchId!, RunStatus.success, {
      itemsTotal: ok + fail,
      itemsSuccess: ok,
      itemsFailed: fail,
      meta: { ok, fail },
    });

    log.info(
      { batchId, ok, fail },
      "Bookmakers seeding completed"
    );
    return { batchId, ok, fail, total: ok + fail };
  } catch (error) {
    log.error({ batchId, err: error }, "Bookmakers seeding failed");

    await finishSeedBatch(batchId!, RunStatus.failed, {
      itemsTotal: ok + fail,
      itemsSuccess: ok,
      itemsFailed: fail,
      errorMessage: String(error).slice(0, 500),
      meta: { ok, fail },
    });

    return {
      batchId,
      ok,
      fail,
      total: ok + fail,
    };
  }
}
