/**
 * Sync layer for fixtures: incremental updates only.
 * When opts.batchId is provided, writes per-fixture results to seed_items.
 */
import type { FixtureDTO } from "@repo/types/sport-data/common";
import type { Prisma } from "@repo/db";
import { FixtureState, RunStatus, prisma } from "@repo/db";
import {
  transformFixtureDto,
  isValidFixtureStateTransition,
} from "../transform/fixtures.transform";
import { trackSeedItem } from "../seeds/seed.utils";
import { chunk, safeBigInt } from "../utils";
import { getLogger } from "../../logger";

type DbFixtureState = (typeof FixtureState)[keyof typeof FixtureState];

const log = getLogger("SyncFixtures");
const CHUNK_SIZE = 8;

export type SyncFixturesResult = {
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  total: number;
};

type ExistingRow = {
  externalId: bigint;
  name: string;
  leagueId: number | null;
  seasonId: number | null;
  homeTeamId: number;
  awayTeamId: number;
  startIso: string;
  startTs: number;
  state: DbFixtureState;
  liveMinute: number | null;
  result: string | null;
  homeScore90: number | null;
  awayScore90: number | null;
  homeScoreET: number | null;
  awayScoreET: number | null;
  penHome: number | null;
  penAway: number | null;
  stage: string | null;
  round: string | null;
  leg: string | null;
  aggregateId: bigint | null;
};

function isSameFixture(
  existing: ExistingRow,
  payload: {
    name: string;
    leagueId: number | null;
    seasonId: number | null;
    homeTeamId: number;
    awayTeamId: number;
    startIso: string;
    startTs: number;
    state: DbFixtureState;
    liveMinute: number | null;
    result: string | null;
    homeScore90: number | null;
    awayScore90: number | null;
    homeScoreET: number | null;
    awayScoreET: number | null;
    penHome: number | null;
    penAway: number | null;
    stage: string | null;
    round: string | null;
    leg: string | null;
    aggregateId: bigint | null;
  }
): boolean {
  return (
    existing.name === payload.name &&
    existing.leagueId === payload.leagueId &&
    existing.seasonId === payload.seasonId &&
    existing.homeTeamId === payload.homeTeamId &&
    existing.awayTeamId === payload.awayTeamId &&
    existing.startIso === payload.startIso &&
    existing.startTs === payload.startTs &&
    existing.state === payload.state &&
    existing.liveMinute === payload.liveMinute &&
    existing.result === payload.result &&
    existing.homeScore90 === payload.homeScore90 &&
    existing.awayScore90 === payload.awayScore90 &&
    existing.homeScoreET === payload.homeScoreET &&
    existing.awayScoreET === payload.awayScoreET &&
    existing.penHome === payload.penHome &&
    existing.penAway === payload.penAway &&
    existing.stage === payload.stage &&
    existing.round === payload.round &&
    existing.leg === payload.leg &&
    existing.aggregateId === payload.aggregateId
  );
}

type ResolvedPayload = {
  name: string;
  leagueId: number | null;
  seasonId: number | null;
  homeTeamId: number;
  awayTeamId: number;
  startIso: string;
  startTs: number;
  state: DbFixtureState;
  liveMinute: number | null;
  result: string | null;
  homeScore90: number | null;
  awayScore90: number | null;
  homeScoreET: number | null;
  awayScoreET: number | null;
  penHome: number | null;
  penAway: number | null;
  stage: string | null;
  round: string | null;
  leg: string | null;
  aggregateId: bigint | null;
};

function toChangeVal(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "null";
  return String(v);
}

const AUDIT_LOG_FIELDS: (keyof ResolvedPayload)[] = [
  "name",
  "state",
  "liveMinute",
  "result",
  "homeScore90",
  "awayScore90",
  "homeScoreET",
  "awayScoreET",
  "penHome",
  "penAway",
  "stage",
  "round",
  "leg",
  "aggregateId",
];

/** Build diff object for updated fixtures: only fields that changed, format "old→new". */
function buildFixtureChanges(
  existing: ExistingRow,
  resolved: ResolvedPayload
): Record<string, string> {
  const changes: Record<string, string> = {};
  for (const k of AUDIT_LOG_FIELDS) {
    const oldVal = (existing as Record<string, unknown>)[k];
    const newVal = resolved[k];
    if (
      toChangeVal(oldVal as string | number | null) !==
      toChangeVal(newVal as string | number | null)
    ) {
      changes[k] =
        `${toChangeVal(oldVal as string | number | null)}→${toChangeVal(newVal as string | number | null)}`;
    }
  }
  return changes;
}

/**
 * Convert "old→new" string map to { old, new } for fixture_audit_log.changes JSON.
 * The admin Timeline displays each field as "old → new"; this shape is what we persist and return from the API.
 */
function changesToAuditShape(
  raw: Record<string, string>
): Record<string, { old: string; new: string }> {
  const out: Record<string, { old: string; new: string }> = {};
  for (const [key, val] of Object.entries(raw)) {
    const idx = val.indexOf("→");
    out[key] =
      idx === -1
        ? { old: "null", new: val }
        : { old: val.slice(0, idx), new: val.slice(idx + 1) };
  }
  return out;
}

type FixtureOutcome =
  | {
      outcome: "inserted";
      fixture: FixtureDTO;
      resolvedPayload: ResolvedPayload;
    }
  | {
      outcome: "updated";
      fixture: FixtureDTO;
      existing: ExistingRow;
      resolvedPayload: ResolvedPayload;
    }
  | {
      outcome: "skipped";
      reason: "no-change" | "invalid-state-transition";
      fixture: FixtureDTO;
      existing?: ExistingRow;
      resolvedPayload: ResolvedPayload;
    };

/**
 * Sync fixtures: transform, resolve FKs, compare with DB, then insert/update/skip.
 * When opts.batchId is set (and not dryRun), writes per-fixture seed_items.
 */
export async function syncFixtures(
  fixtures: FixtureDTO[],
  opts?: {
    dryRun?: boolean;
    signal?: AbortSignal;
    batchId?: number;
    jobRunId?: number;
    /** When true, skip state transition validation (e.g. admin explicitly syncing one fixture). */
    bypassStateValidation?: boolean;
  }
): Promise<SyncFixturesResult> {
  const dryRun = !!opts?.dryRun;
  const batchId = opts?.batchId;
  const jobRunId = opts?.jobRunId ?? null;
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  if (!fixtures?.length) {
    return { inserted: 0, updated: 0, skipped: 0, failed: 0, total: 0 };
  }

  // De-dupe by externalId
  const seen = new Set<string>();
  const uniqueFixtures: FixtureDTO[] = [];
  const duplicates: FixtureDTO[] = [];
  for (const f of fixtures) {
    const key = String(f.externalId);
    if (seen.has(key)) {
      skipped += 1;
      if (batchId && !dryRun) duplicates.push(f);
    } else {
      seen.add(key);
      uniqueFixtures.push(f);
    }
  }

  if (batchId && !dryRun && duplicates.length > 0) {
    await Promise.all(
      duplicates.map((f) =>
        trackSeedItem(
          batchId,
          `fixture:${f.externalId}`,
          RunStatus.skipped,
          undefined,
          { name: f.name ?? "", action: "skipped", reason: "duplicate" }
        )
      )
    );
  }

  // Batch resolve leagues, seasons, teams
  const leagueExternalIds = uniqueFixtures
    .map((f) => f.leagueExternalId)
    .filter((id): id is number => id != null);
  const uniqueLeagueIds = [...new Set(leagueExternalIds.map(String))];
  const leagueMap = new Map<string, number>();
  if (uniqueLeagueIds.length > 0) {
    const leagues = await prisma.leagues.findMany({
      where: {
        externalId: { in: uniqueLeagueIds.map((id) => safeBigInt(id)) },
      },
      select: { id: true, externalId: true },
    });
    for (const league of leagues) {
      leagueMap.set(String(league.externalId), league.id);
    }
  }

  const seasonExternalIds = uniqueFixtures
    .map((f) => f.seasonExternalId)
    .filter((id): id is number => id != null);
  const uniqueSeasonIds = [...new Set(seasonExternalIds.map(String))];
  const seasonMap = new Map<string, number>();
  if (uniqueSeasonIds.length > 0) {
    const seasons = await prisma.seasons.findMany({
      where: {
        externalId: { in: uniqueSeasonIds.map((id) => safeBigInt(id)) },
      },
      select: { id: true, externalId: true },
    });
    for (const season of seasons) {
      seasonMap.set(String(season.externalId), season.id);
    }
  }

  const homeTeamIds = uniqueFixtures.map((f) => f.homeTeamExternalId);
  const awayTeamIds = uniqueFixtures.map((f) => f.awayTeamExternalId);
  const allTeamIds = [...new Set([...homeTeamIds, ...awayTeamIds].map(String))];
  const teamMap = new Map<string, number>();
  if (allTeamIds.length > 0) {
    const teams = await prisma.teams.findMany({
      where: {
        externalId: { in: allTeamIds.map((id) => safeBigInt(id)) },
      },
      select: { id: true, externalId: true },
    });
    for (const team of teams) {
      teamMap.set(String(team.externalId), team.id);
    }
  }

  for (const group of chunk(uniqueFixtures, CHUNK_SIZE)) {
    if (opts?.signal?.aborted) {
      log.warn("syncFixtures aborted by signal");
      break;
    }
    const groupExternalIds = group.map((f) => safeBigInt(f.externalId));
    const existingRows = await prisma.fixtures.findMany({
      where: { externalId: { in: groupExternalIds } },
      select: {
        externalId: true,
        name: true,
        leagueId: true,
        seasonId: true,
        homeTeamId: true,
        awayTeamId: true,
        startIso: true,
        startTs: true,
        state: true,
        liveMinute: true,
        result: true,
        homeScore90: true,
        awayScore90: true,
        homeScoreET: true,
        awayScoreET: true,
        penHome: true,
        penAway: true,
        stage: true,
        round: true,
        leg: true,
        aggregateId: true,
      },
    });
    const existingByExtId = new Map(
      existingRows.map((r) => [String(r.externalId), r as ExistingRow])
    );

    const results = await Promise.allSettled(
      group.map(async (fixture): Promise<FixtureOutcome> => {
        const extIdKey = String(safeBigInt(fixture.externalId));
        const existing = existingByExtId.get(extIdKey);

        if (!fixture.name) {
          throw new Error(
            `No name specified for fixture (externalId: ${fixture.externalId})`
          );
        }
        if (!fixture.startTs) {
          throw new Error(
            `No start timestamp specified for fixture (externalId: ${fixture.externalId})`
          );
        }

        const payload = transformFixtureDto(fixture);
        const leagueId =
          payload.leagueExternalId != null
            ? (leagueMap.get(String(payload.leagueExternalId)) ?? null)
            : null;
        const seasonId =
          payload.seasonExternalId != null
            ? (seasonMap.get(String(payload.seasonExternalId)) ?? null)
            : null;
        const homeTeamId = teamMap.get(String(payload.homeTeamExternalId));
        const awayTeamId = teamMap.get(String(payload.awayTeamExternalId));

        if (!homeTeamId) {
          throw new Error(
            `Home team not found (externalId: ${payload.homeTeamExternalId})`
          );
        }
        if (!awayTeamId) {
          throw new Error(
            `Away team not found (externalId: ${payload.awayTeamExternalId})`
          );
        }

        const resolvedPayload: ResolvedPayload = {
          name: payload.name,
          leagueId,
          seasonId,
          homeTeamId,
          awayTeamId,
          startIso: payload.startIso,
          startTs: payload.startTs,
          state: payload.state,
          liveMinute: payload.liveMinute,
          result: payload.result,
          homeScore90: payload.homeScore90,
          awayScore90: payload.awayScore90,
          homeScoreET: payload.homeScoreET,
          awayScoreET: payload.awayScoreET,
          penHome: payload.penHome,
          penAway: payload.penAway,
          stage: payload.stage,
          round: payload.round,
          leg: payload.leg,
          aggregateId: payload.aggregateId ? BigInt(payload.aggregateId) : null,
        };

        // State validation: disallow invalid transitions (unless bypassed, e.g. admin sync-by-id)
        if (
          !opts?.bypassStateValidation &&
          existing &&
          !isValidFixtureStateTransition(existing.state, payload.state)
        ) {
          log.warn(
            {
              externalId: fixture.externalId,
              current: existing.state,
              next: payload.state,
            },
            "Invalid fixture state transition; skipping update"
          );
          return {
            outcome: "skipped",
            reason: "invalid-state-transition",
            fixture,
            existing,
            resolvedPayload,
          };
        }

        if (!existing) {
          if (!dryRun) {
            const upserted = await prisma.fixtures.upsert({
              where: { externalId: safeBigInt(payload.externalId) },
              create: {
                externalId: safeBigInt(payload.externalId),
                ...resolvedPayload,
              },
              update: {
                ...resolvedPayload,
                updatedAt: new Date(),
              },
            });
            // New fixture: log only fields that have a non-null value (avoid noisy null→null for penHome, penAway, etc.)
            const insertChanges: Record<string, { old: string; new: string }> =
              {};
            for (const k of AUDIT_LOG_FIELDS) {
              const newVal = toChangeVal(
                resolvedPayload[k] as string | number | null | undefined
              );
              if (newVal !== "null") {
                insertChanges[k] = { old: "null", new: newVal };
              }
            }
            if (Object.keys(insertChanges).length > 0) {
              await prisma.fixtureAuditLog.create({
                data: {
                  fixtureId: upserted.id,
                  jobRunId,
                  source: "job",
                  changes: insertChanges,
                },
              });
            }
          }
          return { outcome: "inserted", fixture, resolvedPayload };
        }

        if (isSameFixture(existing, resolvedPayload)) {
          return {
            outcome: "skipped",
            reason: "no-change",
            fixture,
            existing,
            resolvedPayload,
          };
        }

        if (!dryRun) {
          const upserted = await prisma.fixtures.upsert({
            where: { externalId: safeBigInt(payload.externalId) },
            create: {
              externalId: safeBigInt(payload.externalId),
              ...resolvedPayload,
            },
            update: {
              ...resolvedPayload,
              updatedAt: new Date(),
            },
          });
          // Record what changed: diff existing vs resolvedPayload, convert to { old, new } per field, then one audit row (source "job", jobRunId set so Timeline can show which run did it)
          const rawChanges = buildFixtureChanges(existing, resolvedPayload);
          const changes = changesToAuditShape(rawChanges);
          if (Object.keys(changes).length > 0) {
            await prisma.fixtureAuditLog.create({
              data: {
                fixtureId: upserted.id,
                jobRunId,
                source: "job",
                changes,
              },
            });
          }
        }
        return { outcome: "updated", fixture, existing, resolvedPayload };
      })
    );

    for (let i = 0; i < results.length; i++) {
      const r = results[i]!;
      const fixture = group[i]!;
      const itemKey = `fixture:${fixture.externalId}`;
      if (r.status === "fulfilled") {
        const v = r.value;
        switch (v.outcome) {
          case "inserted":
            inserted += 1;
            break;
          case "updated":
            updated += 1;
            break;
          case "skipped":
            skipped += 1;
            break;
        }
        if (batchId && !dryRun) {
          const meta: Prisma.InputJsonObject = {
            name: fixture.name ?? "",
            action: v.outcome === "skipped" ? "skipped" : v.outcome,
            ...(v.outcome === "skipped" && v.reason
              ? { reason: v.reason }
              : {}),
            ...(v.outcome === "updated" && v.existing && v.resolvedPayload
              ? { changes: buildFixtureChanges(v.existing, v.resolvedPayload) }
              : {}),
          };
          const status =
            v.outcome === "skipped" ? RunStatus.skipped : RunStatus.success;
          await trackSeedItem(batchId, itemKey, status, undefined, meta);
        }
      } else {
        log.warn(
          { externalId: fixture.externalId, error: r.reason },
          "Fixture sync failed (Promise rejected)"
        );
        failed += 1;
        if (batchId && !dryRun) {
          const err = r.reason as { message?: string } | undefined;
          const errorMessage = (err?.message ?? String(r.reason)).slice(0, 500);
          await trackSeedItem(
            batchId,
            itemKey,
            RunStatus.failed,
            errorMessage,
            {
              name: fixture.name ?? "",
            }
          );
        }
      }
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
