/**
 * Pure transform layer for fixtures. No Prisma, DB, fetch, or side effects.
 * Used by both seed (bulk) and sync (incremental).
 */
import type { FixtureDTO } from "@repo/types/sport-data/common";
import {
  NOT_STARTED_STATES,
  IN_PLAY_STATES,
  BREAK_STATES,
  FINISHED_STATES,
  CANCELLED_STATES,
} from "@repo/utils";
import { FixtureState as DbFixtureState } from "@repo/db";

const DB_STATES = new Set<string>(Object.values(DbFixtureState));

export type FixtureTransformResult = {
  externalId: number;
  name: string;
  leagueExternalId: number | null;
  seasonExternalId: number | null;
  homeTeamExternalId: number;
  awayTeamExternalId: number;
  startIso: string;
  startTs: number;
  state: (typeof DbFixtureState)[keyof typeof DbFixtureState];
  result: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homeScore90: number | null;
  awayScore90: number | null;
  homeScoreET: number | null;
  awayScoreET: number | null;
  penHome: number | null;
  penAway: number | null;
  stage: string | null;
  round: string | null;
  liveMinute: number | null;
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
 * Coerce DTO state to DB FixtureState. States now map 1:1; validate and default to NS.
 */
export function coerceDbFixtureState(
  state: FixtureDTO["state"] | string
): (typeof DbFixtureState)[keyof typeof DbFixtureState] {
  const s = String(state);
  if (DB_STATES.has(s)) return s as (typeof DbFixtureState)[keyof typeof DbFixtureState];
  return DbFixtureState.NS;
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
    homeScore90: dto.homeScore90 ?? null,
    awayScore90: dto.awayScore90 ?? null,
    homeScoreET: dto.homeScoreET ?? null,
    awayScoreET: dto.awayScoreET ?? null,
    penHome: dto.penHome ?? null,
    penAway: dto.penAway ?? null,
    stage: dto.stage ?? null,
    round: dto.round ?? null,
    liveMinute: dto.liveMinute ?? null,
  };
}

/**
 * Allowed state transitions using helper groups:
 * NOT_STARTED -> IN_PLAY, BREAK, CANCELLED
 * IN_PLAY -> IN_PLAY, BREAK, FINISHED, CANCELLED
 * BREAK -> IN_PLAY, BREAK, FINISHED, CANCELLED
 * FINISHED / CANCELLED -> terminal (no transition)
 */
export function isValidFixtureStateTransition(
  currentState: (typeof DbFixtureState)[keyof typeof DbFixtureState],
  nextState: (typeof DbFixtureState)[keyof typeof DbFixtureState]
): boolean {
  if (currentState === nextState) return true;
  if (FINISHED_STATES.has(currentState) || CANCELLED_STATES.has(currentState))
    return false;
  if (NOT_STARTED_STATES.has(currentState))
    return (
      IN_PLAY_STATES.has(nextState) ||
      BREAK_STATES.has(nextState) ||
      CANCELLED_STATES.has(nextState)
    );
  if (IN_PLAY_STATES.has(currentState) || BREAK_STATES.has(currentState))
    return (
      IN_PLAY_STATES.has(nextState) ||
      BREAK_STATES.has(nextState) ||
      FINISHED_STATES.has(nextState) ||
      CANCELLED_STATES.has(nextState)
    );
  return false;
}
