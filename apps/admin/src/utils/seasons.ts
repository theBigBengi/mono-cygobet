import type {
  SeasonDB,
  SeasonProvider,
  UnifiedSeason,
} from "@/types";
import type {
  AdminSeasonsListResponse,
  AdminProviderSeasonsResponse,
} from "@repo/types";

// Normalize string for comparison (name: trim only)
function normalizeName(str: string | null | undefined): string {
  if (!str) return "";
  return str.trim();
}

// Normalize date string (trim; null/undefined treated as empty)
function normalizeDate(date: string | null | undefined): string {
  if (!date) return "";
  return date.trim();
}

export function unifySeasons(
  dbData: AdminSeasonsListResponse | undefined,
  providerData: AdminProviderSeasonsResponse | undefined
): UnifiedSeason[] {
  // Allow partial data - process what we have
  if (!dbData && !providerData) return [];

  const dbMap = new Map<string, SeasonDB>();
  if (dbData?.data) {
    dbData.data.forEach((s: AdminSeasonsListResponse["data"][0]) => {
      const seasonWithLeague = s as typeof s & {
        league?: {
          id: number;
          name: string;
          imagePath: string | null;
          type: string;
          externalId: string;
          country: {
            id: number;
            name: string;
            imagePath: string | null;
            iso2: string | null;
            iso3: string | null;
            externalId: string;
          } | null;
        } | null;
        updatedAt?: string;
      };
      dbMap.set(s.externalId, {
        ...s,
        league: seasonWithLeague.league || null,
      } as SeasonDB);
    });
  }

  const providerMap = new Map<string, SeasonProvider>();
  if (providerData?.data) {
    providerData.data.forEach((s: AdminProviderSeasonsResponse["data"][0]) => {
      providerMap.set(String(s.externalId), s);
    });
  }

  const result: UnifiedSeason[] = [];
  const allExternalIds = new Set([
    ...Array.from(dbMap.keys()),
    ...Array.from(providerMap.keys()),
  ]);

  allExternalIds.forEach((externalId) => {
    const db = dbMap.get(externalId);
    const provider = providerMap.get(externalId);

    let source: "db" | "provider" | "both" = "both";
    let status: UnifiedSeason["status"] = "ok";

    if (db && !provider) {
      source = "db";
      status = "extra-in-db";
    } else if (provider && !db) {
      source = "provider";
      status = "missing-in-db";
    } else if (db && provider) {
      source = "both";
      // Check for mismatches with normalization
      const dbNameNorm = normalizeName(db.name);
      const providerNameNorm = normalizeName(provider.name);
      const dbStartDateNorm = normalizeDate(db.startDate);
      const providerStartDateNorm = normalizeDate(provider.startDate || null);
      const dbEndDateNorm = normalizeDate(db.endDate);
      const providerEndDateNorm = normalizeDate(provider.endDate || null);

      if (
        dbNameNorm !== providerNameNorm ||
        dbStartDateNorm !== providerStartDateNorm ||
        dbEndDateNorm !== providerEndDateNorm
      ) {
        status = "mismatch";
      } else {
        status = "ok";
      }
    }

    // Get league from either source
    const dbLeague = db?.league;
    const league = dbLeague || null;

    // Get league externalId - from DB league if available, otherwise from provider's leagueExternalId
    let leagueExternalId: string | null = null;
    if (dbLeague?.externalId) {
      leagueExternalId = dbLeague.externalId;
    } else if (provider?.leagueExternalId) {
      leagueExternalId = String(provider.leagueExternalId);
    }

    // Get updatedAt from DB data (if exists)
    const updatedAt = db
      ? (db as typeof db & { updatedAt?: string }).updatedAt
      : undefined;

    result.push({
      externalId,
      name: db?.name || provider?.name || "",
      startDate: db?.startDate || provider?.startDate || null,
      endDate: db?.endDate || provider?.endDate || null,
      isCurrent: db?.isCurrent ?? provider?.isCurrent ?? false,
      source,
      status,
      dbData: db,
      providerData: provider,
      league: league
        ? {
            id: league.id,
            name: league.name,
            imagePath: league.imagePath || null,
            type: league.type,
            externalId: leagueExternalId || "",
            country: league.country || null,
          }
        : null,
      updatedAt,
      leagueInDb: provider?.leagueInDb ?? false,
    });
  });

  // Sort by status severity (missing/mismatch/extra first, ok last), then by externalId
  const statusOrder: Record<UnifiedSeason["status"], number> = {
    "missing-in-db": 1,
    mismatch: 2,
    "extra-in-db": 3,
    new: 4,
    ok: 5,
  };

  return result.sort((a, b) => {
    const statusDiff =
      (statusOrder[a.status] || 5) - (statusOrder[b.status] || 5);
    if (statusDiff !== 0) return statusDiff;
    // Sort by externalId numeric ascending
    const aNum = Number(a.externalId);
    const bNum = Number(b.externalId);
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return aNum - bNum;
    }
    return a.externalId.localeCompare(b.externalId);
  });
}

export function calculateDiffStats(unifiedData: UnifiedSeason[]) {
  const dbCount = unifiedData.filter(
    (s) => s.source === "db" || s.source === "both"
  ).length;
  const providerCount = unifiedData.filter(
    (s) => s.source === "provider" || s.source === "both"
  ).length;
  const missing = unifiedData.filter(
    (s) => s.status === "missing-in-db"
  ).length;
  const extra = unifiedData.filter((s) => s.status === "extra-in-db").length;
  const mismatch = unifiedData.filter((s) => s.status === "mismatch").length;
  const ok = unifiedData.filter((s) => s.status === "ok").length;

  return { dbCount, providerCount, missing, extra, mismatch, ok };
}

