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
) {
  // In dry-run mode, skip all database writes including batch tracking
  if (opts?.dryRun) {
    console.log(
      `🧪 DRY RUN MODE: ${odds?.length ?? 0} odds would be processed (no database changes)`
    );
    return { batchId: null, ok: 0, fail: 0, total: odds?.length ?? 0 };
  }

  let batchId = opts?.batchId;
  let createdHere = false;

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
    createdHere = true;
  }

  if (!odds?.length) {
    await finishSeedBatch(batchId!, RunStatus.success, {
      itemsTotal: 0,
      itemsSuccess: 0,
      itemsFailed: 0,
      meta: { reason: "no-input" },
    });
    return { batchId, ok: 0, fail: 0, total: 0 };
  }

  console.log(`🎲 Starting odds seeding: ${odds.length} odds to process`);

  // De-dupe input
  const seen = new Set<string>();
  const uniqueOdds: typeof odds = [];
  const duplicates: typeof odds = [];

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
      `⚠️  Input contained ${duplicates.length} duplicate odds, processing ${uniqueOdds.length} unique items`
    );
    const duplicatePromises = duplicates.map((odd) =>
      trackSeedItem(
        batchId!,
        String(odd.externalId),
        RunStatus.skipped,
        undefined,
        {
          name: odd.name || odd.label || "Unknown",
          reason: "duplicate",
        }
      )
    );
    await Promise.allSettled(duplicatePromises);
  }

  // Batch lookup fixtures
  const fixtureExternalIds = uniqueOdds
    .map((odd) => odd.fixtureExternalId)
    .filter((id): id is number => id != null);
  const uniqueFixtureIds = [...new Set(fixtureExternalIds.map(String))];
  const fixtureMap = new Map<string, number>();

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

    console.log(
      `✅ [${batchId}] Fixture lookup completed: ${fixtures.length}/${uniqueFixtureIds.length} fixtures found`
    );
  }

  // Batch lookup bookmakers
  const bookmakerExternalIds = uniqueOdds
    .map((odd) => odd.bookmakerExternalId)
    .filter((id): id is number => id != null);
  const uniqueBookmakerIds = [...new Set(bookmakerExternalIds.map(String))];
  const bookmakerMap = new Map<string, number>();

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

    console.log(
      `✅ [${batchId}] Bookmaker lookup completed: ${bookmakers.length}/${uniqueBookmakerIds.length} bookmakers found`
    );
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

  let ok = 0;
  let fail = 0;
  const fixturesToFlag = new Set<number>();

  try {
    for (const group of chunk(uniqueOdds, CHUNK_SIZE)) {
      // Process all odds in the chunk in parallel
      const chunkResults = await Promise.allSettled(
        group.map(async (odd) => {
          try {
            // Validate required fields
            if (!odd.name && !odd.label) {
              throw new Error("Odd must have either name or label");
            }
            if (odd.value == null || odd.value === "") {
              throw new Error("Odd value is required");
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
                ? bookmakerMap.get(String(odd.bookmakerExternalId)) ?? null
                : null;

            // Derive startingAt from startingAtTs (Unix seconds)
            const startingAt = new Date(odd.startingAtTs * 1000).toISOString();

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

            await trackSeedItem(
              batchId!,
              String(odd.externalId),
              RunStatus.success,
              undefined,
              {
                name: odd.name || odd.label || "Unknown",
                externalId: odd.externalId,
              }
            );

            return { success: true, odd };
          } catch (e: any) {
            const errorCode = e?.code || "UNKNOWN_ERROR";
            const errorMessage = e?.message || "Unknown error";

            await trackSeedItem(
              batchId!,
              String(odd.externalId),
              RunStatus.failed,
              errorMessage.slice(0, 500),
              {
                name: odd.name || odd.label || "Unknown",
                externalId: odd.externalId,
                errorCode,
                errorMessage: errorMessage.slice(0, 200),
              }
            );

            console.log(
              `❌ [${batchId}] Odd failed: ${odd.name || odd.label} (ID: ${odd.externalId}) - ${errorMessage}`
            );

            return { success: false, odd, error: errorMessage };
          }
        })
      );

      // Count successes and failures from this chunk
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

    // Batch update fixtures to flag as having odds
    if (fixturesToFlag.size > 0) {
      await prisma.fixtures.updateMany({
        where: { id: { in: Array.from(fixturesToFlag) } },
        data: { hasOdds: true },
      });
      console.log(
        `✅ [${batchId}] Flagged ${fixturesToFlag.size} fixtures as having odds`
      );
    }

    await finishSeedBatch(batchId!, RunStatus.success, {
      itemsTotal: ok + fail,
      itemsSuccess: ok,
      itemsFailed: fail,
      meta: { ok, fail, fixturesFlagged: fixturesToFlag.size },
    });

    console.log(
      `🎉 [${batchId}] Odds seeding completed: ${ok} success, ${fail} failed`
    );
    return { batchId, ok, fail, total: ok + fail };
  } catch (e: any) {
    console.log(
      `💥 [${batchId}] Unexpected error during odds seeding: ${
        e?.message || "Unknown error"
      }`
    );
    await finishSeedBatch(batchId!, RunStatus.failed, {
      itemsTotal: ok + fail,
      itemsSuccess: ok,
      itemsFailed: fail,
      errorMessage: String(e?.message ?? e).slice(0, 500),
      meta: { ok, fail },
    });

    return { batchId, ok, fail, total: ok + fail };
  }
}

