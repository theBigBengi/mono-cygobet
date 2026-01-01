import type {
  TeamDB,
  TeamProvider,
  UnifiedTeam,
} from "@/types";
import type {
  AdminTeamsListResponse,
  AdminProviderTeamsResponse,
} from "@repo/types";

// Normalize string for comparison (name: trim only)
function normalizeName(str: string | null | undefined): string {
  if (!str) return "";
  return str.trim();
}

// Normalize imagePath (trim; null/undefined treated as empty)
function normalizeImagePath(path: string | null | undefined): string {
  if (!path) return "";
  return path.trim();
}

export function unifyTeams(
  dbData: AdminTeamsListResponse | undefined,
  providerData: AdminProviderTeamsResponse | undefined
): UnifiedTeam[] {
  // Allow partial data - process what we have
  if (!dbData && !providerData) return [];

  const dbMap = new Map<string, TeamDB>();
  if (dbData?.data) {
    dbData.data.forEach((t: AdminTeamsListResponse["data"][0]) => {
      const teamWithCountry = t as typeof t & {
        country?: {
          id: number;
          name: string;
          imagePath: string | null;
          iso2: string | null;
          iso3: string | null;
          externalId: string;
        } | null;
        updatedAt?: string;
      };
      dbMap.set(t.externalId, {
        ...t,
        country: teamWithCountry.country || null,
      } as TeamDB);
    });
  }

  const providerMap = new Map<string, TeamProvider>();
  if (providerData?.data) {
    providerData.data.forEach((t: AdminProviderTeamsResponse["data"][0]) => {
      providerMap.set(String(t.externalId), {
        externalId: t.externalId,
        name: t.name,
        imagePath: t.imagePath ?? null,
        type: t.type ?? null,
        shortCode: t.shortCode ?? null,
        founded: t.founded ?? null,
        countryExternalId: t.countryExternalId ?? null,
        country: t.country,
        leagueInDb: t.leagueInDb,
      });
    });
  }

  const result: UnifiedTeam[] = [];
  const allExternalIds = new Set([
    ...Array.from(dbMap.keys()),
    ...Array.from(providerMap.keys()),
  ]);

  allExternalIds.forEach((externalId) => {
    const db = dbMap.get(externalId);
    const provider = providerMap.get(externalId);

    let source: "db" | "provider" | "both" = "both";
    let status: UnifiedTeam["status"] = "ok";

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
      const dbImageNorm = normalizeImagePath(db.imagePath);
      const providerImageNorm = normalizeImagePath(provider.imagePath);
      const dbTypeNorm = normalizeName(db.type);
      const providerTypeNorm = normalizeName(provider.type || "");

      if (
        dbNameNorm !== providerNameNorm ||
        dbImageNorm !== providerImageNorm ||
        dbTypeNorm !== providerTypeNorm
      ) {
        status = "mismatch";
      } else {
        status = "ok";
      }
    }

    // Get country from either source
    const dbCountry = db?.country;
    const providerCountry = provider?.country;
    const country = dbCountry || providerCountry || null;

    // Get country externalId - from DB country if available, otherwise from provider's countryExternalId
    let countryExternalId: string | null = null;
    if (dbCountry?.externalId) {
      countryExternalId = dbCountry.externalId;
    } else if (provider?.countryExternalId) {
      countryExternalId = String(provider.countryExternalId);
    }

    // Get updatedAt from DB data (if exists)
    const updatedAt = db
      ? (db as typeof db & { updatedAt?: string }).updatedAt
      : undefined;

    result.push({
      externalId,
      name: db?.name || provider?.name || "",
      imagePath: db?.imagePath || provider?.imagePath || null,
      type: db?.type || provider?.type || null,
      shortCode: db?.shortCode || provider?.shortCode || null,
      founded: db?.founded ?? provider?.founded ?? null,
      source,
      status,
      dbData: db,
      providerData: provider,
      country: country
        ? {
            id: country.id,
            name: country.name,
            imagePath: country.imagePath || null,
            iso2: country.iso2 || null,
            iso3: country.iso3 || null,
            externalId: countryExternalId || "",
          }
        : null,
      updatedAt,
      leagueInDb: provider?.leagueInDb ?? false,
    });
  });

  // Sort by status severity (missing/mismatch/extra first, ok last), then by externalId
  const statusOrder: Record<UnifiedTeam["status"], number> = {
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

export function calculateDiffStats(unifiedData: UnifiedTeam[]) {
  const dbCount = unifiedData.filter(
    (t) => t.source === "db" || t.source === "both"
  ).length;
  const providerCount = unifiedData.filter(
    (t) => t.source === "provider" || t.source === "both"
  ).length;
  const missing = unifiedData.filter(
    (t) => t.status === "missing-in-db"
  ).length;
  const extra = unifiedData.filter((t) => t.status === "extra-in-db").length;
  const mismatch = unifiedData.filter((t) => t.status === "mismatch").length;
  const ok = unifiedData.filter((t) => t.status === "ok").length;

  return { dbCount, providerCount, missing, extra, mismatch, ok };
}

