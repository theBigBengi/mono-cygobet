/**
 * Pure transform layer for odds. No Prisma, DB, fetch, or side effects.
 * Used by sync (incremental). Seed uses DTO directly; sync uses this + resolved FKs.
 */
import type { OddsDTO } from "@repo/types/sport-data/common";

export type OddsTransformResult = {
  externalId: string;
  marketExternalId: string;
  marketDescription: string;
  marketName: string;
  sortOrder: number;
  label: string;
  name: string | null;
  handicap: string | null;
  total: string | null;
  value: string;
  probability: string | null;
  winning: boolean;
  startingAt: string;
  startingAtTimestamp: number;
};

/**
 * Derive startingAt (ISO string) from startingAtTs (Unix seconds). Pure.
 */
function startingAtFromTs(startingAtTs: number): string {
  if (!Number.isFinite(startingAtTs)) {
    throw new Error("startingAtTs must be finite");
  }
  return new Date(startingAtTs * 1000).toISOString();
}

/**
 * Transform OddsDTO into a payload ready for upsert (caller resolves fixtureId, bookmakerId).
 * Validates required fields; throws if invalid.
 */
export function transformOddsDto(dto: OddsDTO): OddsTransformResult {
  if (!dto.name && !dto.label) {
    throw new Error("Odd must have either name or label");
  }
  if (dto.value == null || dto.value === "") {
    throw new Error("Odd value is required");
  }
  const valueNum =
    typeof dto.value === "number" ? dto.value : parseFloat(dto.value);
  if (!Number.isFinite(valueNum) || valueNum < 1) {
    throw new Error(
      `Odd value must be a valid number >= 1, got: ${dto.value}`
    );
  }
  if (dto.fixtureExternalId == null || !Number.isFinite(Number(dto.fixtureExternalId))) {
    throw new Error("Fixture external ID is required");
  }
  if (dto.startingAtTs == null || !Number.isFinite(dto.startingAtTs)) {
    throw new Error(
      "startingAtTs (unix seconds) is required and must be finite"
    );
  }

  const startingAt = startingAtFromTs(dto.startingAtTs);

  return {
    externalId: String(dto.externalId),
    marketExternalId: String(dto.marketExternalId),
    marketDescription: dto.marketDescription,
    marketName: dto.marketName,
    sortOrder: dto.sortOrder,
    label: dto.label,
    name: dto.name ?? null,
    handicap: dto.handicap ?? null,
    total: dto.total ?? null,
    value: dto.value,
    probability: dto.probability ?? null,
    winning: dto.winning,
    startingAt,
    startingAtTimestamp: dto.startingAtTs,
  };
}
