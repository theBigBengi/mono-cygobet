// src/etl/seeds/seed.countries.ts
import type { CountryDTO } from "@repo/types/sport-data/common";
import {
  startSeedBatch,
  trackSeedItem,
  finishSeedBatch,
  chunk,
  normIso,
  computeChanges,
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
    if (createdHere) {
      await finishSeedBatch(batchId!, RunStatus.success, {
        itemsTotal: 0,
        itemsSuccess: 0,
        itemsFailed: 0,
        meta: { reason: "no-input" },
      });
    }
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
          entityType: "country",
          name: country.name,
          reason: "duplicate",
        }
      )
    );
    await Promise.allSettled(duplicatePromises);
  }

  // Pre-fetch which countries already exist (with all tracked fields for change detection)
  const allExternalIds = uniqueCountries.map((c) => String(c.externalId));
  const existingRows = await prisma.countries.findMany({
    where: { externalId: { in: allExternalIds } },
    select: {
      externalId: true,
      name: true,
      imagePath: true,
      iso2: true,
      iso3: true,
    },
  });
  const existingByExtId = new Map(
    existingRows.map((r) => [String(r.externalId), r])
  );
  const existingSet = new Set(existingRows.map((r) => String(r.externalId)));

  let ok = 0;
  let fail = 0;

  try {
    for (const group of chunk(uniqueCountries, CHUNK_SIZE)) {
      // Process all countries in the chunk in parallel
      const chunkResults = await Promise.allSettled(
        group.map(async (country) => {
          const action = existingSet.has(String(country.externalId)) ? "updated" : "inserted";
          try {
            if (!country.name) {
              throw new Error(
                `No name specified for country (externalId: ${country.externalId})`
              );
            }

            const iso2 = normIso(country.iso2, 2);
            const iso3 = normIso(country.iso3, 3);

            const updatePayload = {
              name: country.name,
              imagePath: country.imagePath ?? null,
              iso2: iso2 ?? null,
              iso3: iso3 ?? null,
              updatedAt: new Date(),
            };

            await prisma.countries.upsert({
              where: { externalId: String(country.externalId) },
              update: updatePayload,
              create: {
                externalId: String(country.externalId),
                name: country.name,
                imagePath: country.imagePath ?? null,
                iso2,
                iso3,
              },
            });

            // Compute changes for update tracking
            const existing = existingByExtId.get(String(country.externalId));
            const changes = action === "updated"
              ? computeChanges(existing, updatePayload, ["name", "imagePath", "iso2", "iso3"])
              : null;

            await trackSeedItem(
              batchId!,
              String(country.externalId),
              RunStatus.success,
              undefined,
              {
                entityType: "country",
                name: country.name,
                externalId: country.externalId,
                action,
                ...(changes && { changes }),
              }
            );

            return { success: true, country, action };
          } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            const errorCode =
              e && typeof e === "object" && "code" in e
                ? String((e as { code?: string }).code)
                : "UNKNOWN_ERROR";

            const failedAction = action === "updated" ? "update_failed" : "insert_failed";

            await trackSeedItem(
              batchId!,
              String(country.externalId),
              RunStatus.failed,
              errorMessage.slice(0, 500),
              {
                entityType: "country",
                name: country.name,
                externalId: country.externalId,
                errorCode,
                errorMessage: errorMessage.slice(0, 200),
                action: failedAction,
              }
            );

            log.error(
              { batchId, countryName: country.name, externalId: country.externalId, err: e },
              "Country failed"
            );

            return { success: false, country, error: errorMessage, action: failedAction };
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

    if (createdHere) {
      await finishSeedBatch(batchId!, RunStatus.success, {
        itemsTotal: ok + fail,
        itemsSuccess: ok,
        itemsFailed: fail,
        meta: { ok, fail },
      });
    }

    log.info(
      { batchId, ok, fail },
      "Countries seeding completed"
    );
    return { batchId, ok, fail, total: ok + fail };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    log.error({ batchId, err: e }, "Unexpected error during countries seeding");
    if (createdHere) {
      await finishSeedBatch(batchId!, RunStatus.failed, {
        itemsTotal: ok + fail,
        itemsSuccess: ok,
        itemsFailed: fail,
        errorMessage: msg.slice(0, 500),
        meta: { ok, fail },
      });
    }

    return { batchId, ok, fail, total: ok + fail };
  }
}
