import type { OddsDB, OddsProvider, UnifiedOdds } from "@/types";
import type { AdminOddsListResponse, AdminProviderOddsResponse } from "@repo/types";

function normalizeString(str: string | null | undefined): string {
  return (str ?? "").trim();
}

export function unifyOdds(
  dbData: AdminOddsListResponse | undefined,
  providerData: AdminProviderOddsResponse | undefined
): UnifiedOdds[] {
  if (!dbData && !providerData) return [];

  const dbMap = new Map<string, OddsDB>();
  dbData?.data?.forEach((o) => {
    dbMap.set(String(o.externalId), {
      id: o.id,
      externalId: String(o.externalId),
      fixtureExternalId: o.fixtureExternalId,
      fixtureName: o.fixtureName ?? null,
      bookmakerExternalId: o.bookmakerExternalId ?? null,
      bookmakerName: o.bookmakerName ?? null,
      marketExternalId: o.marketExternalId,
      marketName: o.marketName ?? null,
      marketDescription: o.marketDescription,
      label: o.label,
      value: o.value,
      probability: o.probability ?? null,
      winning: o.winning,
      startingAtTs: o.startingAtTimestamp,
      updatedAt: o.updatedAt,
    });
  });

  const providerMap = new Map<string, OddsProvider>();
  providerData?.data?.forEach((o) => {
    providerMap.set(String(o.externalId), {
      externalId: o.externalId,
      fixtureExternalId: o.fixtureExternalId,
      fixtureName: o.fixtureName ?? null,
      bookmakerExternalId: o.bookmakerExternalId,
      bookmakerName: o.bookmakerName,
      marketExternalId: o.marketExternalId,
      marketName: o.marketName,
      marketDescription: o.marketDescription,
      label: o.label,
      value: o.value,
      probability: o.probability,
      winning: o.winning,
      startingAtTs: o.startingAtTs,
    });
  });

  const result: UnifiedOdds[] = [];
  const allExternalIds = new Set([...dbMap.keys(), ...providerMap.keys()]);

  allExternalIds.forEach((externalId) => {
    const db = dbMap.get(externalId);
    const provider = providerMap.get(externalId);

    let source: UnifiedOdds["source"] = "both";
    let status: UnifiedOdds["status"] = "ok";

    if (db && !provider) {
      source = "db";
      status = "extra-in-db";
    } else if (provider && !db) {
      source = "provider";
      status = "missing-in-db";
    } else if (db && provider) {
      source = "both";

      const dbVal = normalizeString(db.value);
      const prVal = normalizeString(provider.value);
      const dbLabel = normalizeString(db.label);
      const prLabel = normalizeString(provider.label);

      if (dbVal !== prVal || dbLabel !== prLabel || db.winning !== provider.winning) {
        status = "mismatch";
      }
    }

    result.push({
      externalId,
      source,
      status,
      fixtureExternalId:
        db?.fixtureExternalId ?? String(provider?.fixtureExternalId ?? ""),
      bookmakerExternalId:
        db?.bookmakerExternalId ?? (provider ? String(provider.bookmakerExternalId) : null),
      bookmakerName: db?.bookmakerName ?? provider?.bookmakerName ?? null,
      marketExternalId:
        db?.marketExternalId ?? String(provider?.marketExternalId ?? ""),
      marketName: db?.marketName ?? provider?.marketName ?? null,
      label: db?.label ?? provider?.label ?? "",
      value: db?.value ?? provider?.value ?? "",
      winning: db?.winning ?? provider?.winning ?? false,
      startingAtTs: db?.startingAtTs ?? provider?.startingAtTs ?? 0,
      dbData: db,
      providerData: provider,
      updatedAt: db?.updatedAt,
    });
  });

  // Sort newest first
  return result.sort((a, b) => b.startingAtTs - a.startingAtTs);
}

export function calculateDiffStats(unifiedData: UnifiedOdds[]) {
  const dbCount = unifiedData.filter((o) => o.source === "db" || o.source === "both").length;
  const providerCount = unifiedData.filter((o) => o.source === "provider" || o.source === "both").length;
  const missing = unifiedData.filter((o) => o.status === "missing-in-db").length;
  const extra = unifiedData.filter((o) => o.status === "extra-in-db").length;
  const mismatch = unifiedData.filter((o) => o.status === "mismatch").length;
  const ok = unifiedData.filter((o) => o.status === "ok").length;
  return { dbCount, providerCount, missing, extra, mismatch, ok };
}


