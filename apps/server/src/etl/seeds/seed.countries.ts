// src/etl/seeds/seed.countries.ts
import type { CountryDTO } from "@repo/types/sport-data/common";
import {
  startSeedBatch,
  trackSeedItem,
  finishSeedBatch,
  chunk,
  safeBigInt,
  normIso,
} from "./seed.utils";
import { RunStatus, RunTrigger, prisma } from "@repo/db";
import { getLogger } from "../../logger";

const log = getLogger("SeedCountries");
const CHUNK_SIZE = 8;

export async function seedCountries(
  countries: CountryDTO[],
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
      { count: countries?.length ?? 0 },
      "Dry run mode; no DB changes"
    );
    return { batchId: null, ok: 0, fail: 0, total: countries?.length ?? 0 };
  }

  let batchId = opts?.batchId;
  let createdHere = false;

  if (!batchId) {
    const started = await startSeedBatch(
      "seed-countries",
      opts?.version ?? "v1",
      { totalInput: countries?.length ?? 0, dryRun: !!opts?.dryRun },
      {
        trigger: opts?.trigger ?? RunTrigger.manual,
        triggeredBy: opts?.triggeredBy ?? null,
        triggeredById: opts?.triggeredById ?? null,
      }
    );
    batchId = started.id;
    createdHere = true;
  }

  if (!countries?.length) {
    await finishSeedBatch(batchId!, RunStatus.success, {
      itemsTotal: 0,
      itemsSuccess: 0,
      itemsFailed: 0,
      meta: { reason: "no-input" },
    });
    return { batchId, ok: 0, fail: 0, total: 0 };
  }

  log.info({ count: countries.length }, "Starting countries seeding");

  // De-dupe input
  const seen = new Set<string>();
  const uniqueCountries: typeof countries = [];
  const duplicates: typeof countries = [];

  for (const country of countries) {
    const key = String(country.externalId);
    if (seen.has(key)) {
      duplicates.push(country);
    } else {
      seen.add(key);
      uniqueCountries.push(country);
    }
  }

  if (duplicates.length > 0) {
    log.warn(
      { duplicates: duplicates.length, unique: uniqueCountries.length },
      "Input contained duplicate countries; processing unique items"
    );
    const duplicatePromises = duplicates.map((country) =>
      trackSeedItem(
        batchId!,
        String(country.externalId),
        RunStatus.skipped,
        undefined,
        {
          name: country.name,
          reason: "duplicate",
        }
      )
    );
    await Promise.allSettled(duplicatePromises);
  }

  let ok = 0;
  let fail = 0;

  try {
    for (const group of chunk(uniqueCountries, CHUNK_SIZE)) {
      // Process all countries in the chunk in parallel
      const chunkResults = await Promise.allSettled(
        group.map(async (country) => {
          try {
            if (!country.name) {
              throw new Error(
                `No name specified for country (externalId: ${country.externalId})`
              );
            }

            const iso2 = normIso(country.iso2, 2);
            const iso3 = normIso(country.iso3, 3);

            await prisma.countries.upsert({
              where: { externalId: safeBigInt(country.externalId) },
              update: {
                name: country.name,
                imagePath: country.imagePath ?? null,
                iso2: iso2 ?? null,
                iso3: iso3 ?? null,
                updatedAt: new Date(),
              },
              create: {
                externalId: safeBigInt(country.externalId),
                name: country.name,
                imagePath: country.imagePath ?? null,
                iso2,
                iso3,
              },
            });

            await trackSeedItem(
              batchId!,
              String(country.externalId),
              RunStatus.success,
              undefined,
              {
                name: country.name,
                externalId: country.externalId,
              }
            );

            return { success: true, country };
          } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            const errorCode =
              e && typeof e === "object" && "code" in e
                ? String((e as { code?: string }).code)
                : "UNKNOWN_ERROR";

            await trackSeedItem(
              batchId!,
              String(country.externalId),
              RunStatus.failed,
              errorMessage.slice(0, 500),
              {
                name: country.name,
                externalId: country.externalId,
                errorCode,
                errorMessage: errorMessage.slice(0, 200),
              }
            );

            log.error(
              { batchId, countryName: country.name, externalId: country.externalId, err: e },
              "Country failed"
            );

            return { success: false, country, error: errorMessage };
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

    await finishSeedBatch(batchId!, RunStatus.success, {
      itemsTotal: ok + fail,
      itemsSuccess: ok,
      itemsFailed: fail,
      meta: { ok, fail },
    });

    log.info(
      { batchId, ok, fail },
      "Countries seeding completed"
    );
    return { batchId, ok, fail, total: ok + fail };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    log.error({ batchId, err: e }, "Unexpected error during countries seeding");
    await finishSeedBatch(batchId!, RunStatus.failed, {
      itemsTotal: ok + fail,
      itemsSuccess: ok,
      itemsFailed: fail,
      errorMessage: msg.slice(0, 500),
      meta: { ok, fail },
    });

    return { batchId, ok, fail, total: ok + fail };
  }
}
