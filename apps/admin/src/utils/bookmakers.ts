import type {
  BookmakerDB,
  BookmakerProvider,
  UnifiedBookmaker,
} from "@/types";
import type {
  AdminBookmakersListResponse,
  AdminProviderBookmakersResponse,
} from "@repo/types";

// Normalize string for comparison (name: trim only)
function normalizeName(str: string | null | undefined): string {
  if (!str) return "";
  return str.trim();
}

export function unifyBookmakers(
  dbData: AdminBookmakersListResponse | undefined,
  providerData: AdminProviderBookmakersResponse | undefined
): UnifiedBookmaker[] {
  // Allow partial data - process what we have
  if (!dbData && !providerData) return [];

  const dbMap = new Map<string, BookmakerDB>();
  if (dbData?.data) {
    dbData.data.forEach((b) => {
      dbMap.set(b.externalId || `db-${b.id}`, {
        ...b,
        updatedAt: b.updatedAt,
      });
    });
  }

  const providerMap = new Map<string, BookmakerProvider>();
  if (providerData?.data) {
    providerData.data.forEach((b) => {
      providerMap.set(String(b.externalId), b);
    });
  }

  const result: UnifiedBookmaker[] = [];
  const allExternalIds = new Set([
    ...Array.from(dbMap.keys()),
    ...Array.from(providerMap.keys()),
  ]);

  allExternalIds.forEach((externalId) => {
    const db = dbMap.get(externalId);
    const provider = providerMap.get(externalId);

    let source: "db" | "provider" | "both" = "both";
    let status: UnifiedBookmaker["status"] = "ok";

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

      if (dbNameNorm !== providerNameNorm) {
        status = "mismatch";
      } else {
        status = "ok";
      }
    }

    // Use externalId from provider if available, otherwise from db
    const finalExternalId = provider?.externalId
      ? String(provider.externalId)
      : db?.externalId || externalId;

    result.push({
      externalId: finalExternalId,
      name: db?.name || provider?.name || "",
      source,
      status,
      dbData: db,
      providerData: provider,
      updatedAt: db?.updatedAt,
    });
  });

  // Sort by status severity (missing/mismatch/extra first, ok last), then by name
  const statusOrder: Record<UnifiedBookmaker["status"], number> = {
    "missing-in-db": 1,
    mismatch: 2,
    "extra-in-db": 3,
    new: 4,
    ok: 5,
  };

  return result.sort((a, b) => {
    const statusDiff = (statusOrder[a.status] || 5) - (statusOrder[b.status] || 5);
    if (statusDiff !== 0) return statusDiff;
    return a.name.localeCompare(b.name);
  });
}

export function calculateDiffStats(unifiedData: UnifiedBookmaker[]) {
  const dbCount = unifiedData.filter(
    (b) => b.source === "db" || b.source === "both"
  ).length;
  const providerCount = unifiedData.filter(
    (b) => b.source === "provider" || b.source === "both"
  ).length;
  const missing = unifiedData.filter((b) => b.status === "missing-in-db").length;
  const extra = unifiedData.filter((b) => b.status === "extra-in-db").length;
  const mismatch = unifiedData.filter((b) => b.status === "mismatch").length;
  const ok = unifiedData.filter((b) => b.status === "ok").length;

  return { dbCount, providerCount, missing, extra, mismatch, ok };
}

