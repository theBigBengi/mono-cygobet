import type {
  CountryDB,
  CountryProvider,
  UnifiedCountry,
} from "@/types";
import type {
  AdminCountriesListResponse,
  AdminProviderCountriesResponse,
} from "@repo/types";

// Normalize string for comparison (name: trim only)
function normalizeName(str: string | null | undefined): string {
  if (!str) return "";
  return str.trim();
}

// Normalize ISO codes (trim + uppercase)
function normalizeISO(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.trim().toUpperCase();
}

// Normalize imagePath (trim; null/undefined treated as empty)
function normalizeImagePath(path: string | null | undefined): string {
  if (!path) return "";
  return path.trim();
}

export function unifyCountries(
  dbData: AdminCountriesListResponse | undefined,
  providerData: AdminProviderCountriesResponse | undefined
): UnifiedCountry[] {
  // Allow partial data - process what we have
  if (!dbData && !providerData) return [];

  const dbMap = new Map<string, CountryDB & { leaguesCount?: number }>();
  if (dbData?.data) {
    dbData.data.forEach((c) => {
      const countryWithLeagues = c as CountryDB & {
        leagues?: Array<{ id: number; name: string }>;
        leaguesCount?: number;
        updatedAt?: string;
      };
      dbMap.set(c.externalId, {
        ...c,
        leagues: countryWithLeagues.leagues || [],
        leaguesCount: countryWithLeagues.leaguesCount,
        updatedAt: countryWithLeagues.updatedAt,
      } as CountryDB & { leaguesCount?: number; updatedAt?: string });
    });
  }

  const providerMap = new Map<string, CountryProvider>();
  if (providerData?.data) {
    providerData.data.forEach((c) => {
      providerMap.set(String(c.externalId), {
        externalId: c.externalId,
        name: c.name,
        imagePath: c.imagePath ?? null,
        iso2: c.iso2 ?? null,
        iso3: c.iso3 ?? null,
      });
    });
  }

  const result: UnifiedCountry[] = [];
  const allExternalIds = new Set([
    ...Array.from(dbMap.keys()),
    ...Array.from(providerMap.keys()),
  ]);

  allExternalIds.forEach((externalId) => {
    const db = dbMap.get(externalId);
    const provider = providerMap.get(externalId);

    let source: "db" | "provider" | "both" = "both";
    let status: UnifiedCountry["status"] = "ok";

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
      const dbIso2Norm = normalizeISO(db.iso2);
      const providerIso2Norm = normalizeISO(provider.iso2);
      const dbIso3Norm = normalizeISO(db.iso3);
      const providerIso3Norm = normalizeISO(provider.iso3);
      const dbImageNorm = normalizeImagePath(db.imagePath);
      const providerImageNorm = normalizeImagePath(provider.imagePath);

      if (
        dbNameNorm !== providerNameNorm ||
        dbIso2Norm !== providerIso2Norm ||
        dbIso3Norm !== providerIso3Norm ||
        dbImageNorm !== providerImageNorm
      ) {
        status = "mismatch";
      } else {
        status = "ok";
      }
    }

    result.push({
      externalId,
      name: db?.name || provider?.name || "",
      imagePath: db?.imagePath || provider?.imagePath || null,
      iso2: db?.iso2 || provider?.iso2 || null,
      iso3: db?.iso3 || provider?.iso3 || null,
      active: db?.active ?? false,
      source,
      status,
      dbData: db ? { ...db, active: db.active ?? false } : undefined,
      providerData: provider,
      leaguesCount: db?.leaguesCount ?? 0,
      updatedAt: (db as { updatedAt?: string })?.updatedAt,
    });
  });

  // Sort by status severity (missing/mismatch/extra first, ok last), then by externalId
  const statusOrder: Record<UnifiedCountry["status"], number> = {
    "missing-in-db": 1,
    mismatch: 2,
    "extra-in-db": 3,
    new: 4,
    ok: 5,
  };

  return result.sort((a, b) => {
    const statusDiff = (statusOrder[a.status] || 7) - (statusOrder[b.status] || 7);
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

export function calculateDiffStats(unifiedData: UnifiedCountry[]) {
  const dbCount = unifiedData.filter(
    (c) => c.source === "db" || c.source === "both"
  ).length;
  const providerCount = unifiedData.filter(
    (c) => c.source === "provider" || c.source === "both"
  ).length;
  const missing = unifiedData.filter((c) => c.status === "missing-in-db").length;
  const extra = unifiedData.filter((c) => c.status === "extra-in-db").length;
  const mismatch = unifiedData.filter((c) => c.status === "mismatch").length;
  const ok = unifiedData.filter((c) => c.status === "ok").length;

  return { dbCount, providerCount, missing, extra, mismatch, ok };
}
