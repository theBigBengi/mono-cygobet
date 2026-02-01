/**
 * Pure transform layer for fixtures. No Prisma, DB, fetch, or side effects.
 * Used by both seed (bulk) and sync (incremental).
 */
import type { FixtureDTO } from "@repo/types/sport-data/common";
import { FixtureState } from "@repo/db";

// DB enum values (schema: NS, LIVE, FT, CAN, INT). HT from provider maps to LIVE.
const DB_STATES = new Set<string>([
  FixtureState.NS,
  FixtureState.LIVE,
  FixtureState.FT,
  FixtureState.CAN,
  FixtureState.INT,
]);

export type FixtureTransformResult = {
  externalId: number;
  name: string;
  leagueExternalId: number | null;
  seasonExternalId: number | null;
  homeTeamExternalId: number;
  awayTeamExternalId: number;
  startIso: string;
  startTs: number;
  state: (typeof FixtureState)[keyof typeof FixtureState];
  result: string | null;
  homeScore: number | null;
  awayScore: number | null;
  stage: string | null;
  round: string | null;
};

/**
 * Normalize result string: trim and replace ":" with "-" for consistent DB/UI.
 */
export function normalizeResult(
  result: string | null | undefined
): string | null {
  if (!result) return null;
  const trimmed = result.trim();
  if (!trimmed) return null;
  return trimmed.replace(/:/g, "-");
}

/**
 * Parse scores from result string ("x-y" or "x:y"). Use normalizeResult first if needed.
 */
export function parseScores(result: string | null | undefined): {
  homeScore: number | null;
  awayScore: number | null;
} {
  if (!result) return { homeScore: null, awayScore: null };
  const match = result.trim().match(/^(\d+)[-:](\d+)$/);
  if (!match || !match[1] || !match[2]) {
    return { homeScore: null, awayScore: null };
  }
  return {
    homeScore: parseInt(match[1], 10),
    awayScore: parseInt(match[2], 10),
  };
}

/**
 * Coerce DTO state to DB FixtureState. Maps HT -> LIVE (HT not in schema).
 */
export function coerceDbFixtureState(
  state: FixtureDTO["state"] | string
): (typeof FixtureState)[keyof typeof FixtureState] {
  const s = String(state).toUpperCase();
  if (s === "HT") return FixtureState.LIVE;
  if (DB_STATES.has(s)) return s as (typeof FixtureState)[keyof typeof FixtureState];
  return FixtureState.NS;
}

/**
 * Derive startIso from startTs (Unix seconds). Pure.
 */
function startIsoFromStartTs(startTs: number): string {
  if (!Number.isFinite(startTs)) {
    throw new Error("startTs must be finite");
  }
  return new Date(startTs * 1000).toISOString();
}

/**
 * Transform a FixtureDTO into a payload ready for upsert (caller resolves FKs).
 */
export function transformFixtureDto(dto: FixtureDTO): FixtureTransformResult {
  const result = normalizeResult(dto.result);
  const parsed = parseScores(result ?? dto.result);
  const homeScore = dto.homeScore ?? parsed.homeScore;
  const awayScore = dto.awayScore ?? parsed.awayScore;
  const state = coerceDbFixtureState(dto.state);
  const startIso = startIsoFromStartTs(dto.startTs);

  return {
    externalId: dto.externalId,
    name: dto.name,
    leagueExternalId: dto.leagueExternalId ?? null,
    seasonExternalId: dto.seasonExternalId ?? null,
    homeTeamExternalId: dto.homeTeamExternalId,
    awayTeamExternalId: dto.awayTeamExternalId,
    startIso,
    startTs: dto.startTs,
    state,
    result,
    homeScore: homeScore ?? null,
    awayScore: awayScore ?? null,
    stage: dto.stage ?? null,
    round: dto.round ?? null,
  };
}

/**
 * Allowed state transitions (DB: NS, LIVE, FT, CAN, INT).
 * Decision: FT, CAN, INT are terminal (no transition to another state).
 * NS -> NS, LIVE, CAN, INT. LIVE -> LIVE, FT, CAN, INT.
 * INT is treated as terminal (e.g. interrupted) like FT/CAN; same rule in seed and sync.
 */
export function isValidFixtureStateTransition(
  currentState: (typeof FixtureState)[keyof typeof FixtureState],
  nextState: (typeof FixtureState)[keyof typeof FixtureState]
): boolean {
  if (currentState === nextState) return true;

  switch (currentState) {
    case FixtureState.NS:
      return (
        nextState === FixtureState.LIVE ||
        nextState === FixtureState.CAN ||
        nextState === FixtureState.INT
      );
    case FixtureState.LIVE:
      return (
        nextState === FixtureState.FT ||
        nextState === FixtureState.CAN ||
        nextState === FixtureState.INT
      );
    case FixtureState.FT:
    case FixtureState.CAN:
    case FixtureState.INT:
      return false;
    default:
      return false;
  }
}
