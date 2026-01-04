import type { FixtureDB, FixtureProvider, UnifiedFixture } from "@/types";
import type {
  AdminFixturesListResponse,
  AdminProviderFixturesResponse,
} from "@repo/types";

// Normalize string for comparison
function normalizeString(str: string | null | undefined): string {
  if (!str) return "";
  return str.trim();
}

// Normalize result string - convert ":" to "-" for consistent comparison
function normalizeResult(result: string | null | undefined): string {
  if (!result) return "";
  return result.trim().replace(/:/g, "-");
}

export function unifyFixtures(
  dbData: AdminFixturesListResponse | undefined,
  providerData: AdminProviderFixturesResponse | undefined
): UnifiedFixture[] {
  // Allow partial data - process what we have
  if (!dbData && !providerData) return [];

  const dbMap = new Map<string, FixtureDB>();
  if (dbData?.data) {
    dbData.data.forEach((f: AdminFixturesListResponse["data"][0]) => {
      dbMap.set(f.externalId, {
        ...f,
        homeTeam: f.homeTeam || null,
        awayTeam: f.awayTeam || null,
        league: f.league || null,
        season: f.season || null,
      } as FixtureDB);
    });
  }

  const providerMap = new Map<string, FixtureProvider>();
  if (providerData?.data) {
    providerData.data.forEach((f: AdminProviderFixturesResponse["data"][0]) => {
      providerMap.set(String(f.externalId), {
        ...f,
        leagueInDb: Boolean(f.leagueExternalId),
        seasonInDb: Boolean(f.seasonExternalId),
      } as FixtureProvider);
    });
  }

  const result: UnifiedFixture[] = [];
  const allExternalIds = new Set([
    ...Array.from(dbMap.keys()),
    ...Array.from(providerMap.keys()),
  ]);

  allExternalIds.forEach((externalId) => {
    const db = dbMap.get(externalId);
    const provider = providerMap.get(externalId);

    let source: "db" | "provider" | "both" = "both";
    let status: UnifiedFixture["status"] = "ok";

    if (db && !provider) {
      source = "db";
      status = "extra-in-db";
    } else if (provider && !db) {
      source = "provider";
      status = "missing-in-db";
    } else if (db && provider) {
      source = "both";
      // Check for mismatches
      const dbNameNorm = normalizeString(db.name);
      const providerNameNorm = normalizeString(provider.name);
      const dbStateNorm = normalizeString(db.state);
      const providerStateNorm = normalizeString(provider.state);
      const dbResultNorm = normalizeResult(db.result);
      const providerResultNorm = normalizeResult(provider.result);

      if (
        dbNameNorm !== providerNameNorm ||
        dbStateNorm !== providerStateNorm ||
        dbResultNorm !== providerResultNorm
      ) {
        status = "mismatch";
      } else {
        status = "ok";
      }
    }

    // Get related data from DB
    const league = db?.league || null;
    const season = db?.season || null;
    const homeTeam = db?.homeTeam || null;
    const awayTeam = db?.awayTeam || null;

    // Get updatedAt from DB data
    const updatedAt = db?.updatedAt;

    result.push({
      externalId,
      name: db?.name || provider?.name || "",
      startIso: db?.startIso || provider?.startIso || null,
      startTs: db?.startTs || provider?.startTs || 0,
      state: db?.state || provider?.state || "",
      result: db?.result || provider?.result || null,
      stageRoundName: db?.stageRoundName || provider?.stageRoundName || null,
      source,
      status,
      dbData: db,
      providerData: provider,
      league,
      season,
      homeTeam,
      awayTeam,
      leagueInDb: Boolean(db?.leagueId),
      seasonInDb: Boolean(db?.seasonId),
      updatedAt,
      // Provider-specific fields
      leagueName: provider?.leagueName ?? null,
      countryName: provider?.countryName ?? null,
      hasOdds: provider?.hasOdds ?? false,
    });
  });

  // Sort by startTs descending (most recent first)
  return result.sort((a, b) => b.startTs - a.startTs);
}

export function calculateDiffStats(unifiedData: UnifiedFixture[]) {
  const dbCount = unifiedData.filter(
    (f) => f.source === "db" || f.source === "both"
  ).length;
  const providerCount = unifiedData.filter(
    (f) => f.source === "provider" || f.source === "both"
  ).length;
  const missing = unifiedData.filter(
    (f) => f.status === "missing-in-db"
  ).length;
  const extra = unifiedData.filter((f) => f.status === "extra-in-db").length;
  const mismatch = unifiedData.filter((f) => f.status === "mismatch").length;
  const ok = unifiedData.filter((f) => f.status === "ok").length;

  return { dbCount, providerCount, missing, extra, mismatch, ok };
}
