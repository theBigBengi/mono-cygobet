// src/utils/routes.ts
// Utility functions for route handlers

import type { GroupFixturesFilter } from "../types/groups";

export interface PaginationQuery {
  page?: number;
  perPage?: number;
}

export interface PaginationResult {
  page: number;
  perPage: number;
  skip: number;
  take: number;
}

/**
 * Calculate pagination values from query parameters
 */
export function getPagination(query: PaginationQuery): PaginationResult {
  const page = query.page ?? 1;
  const perPage = query.perPage ?? 20;
  const skip = (page - 1) * perPage;
  const take = perPage;

  return { page, perPage, skip, take };
}

/**
 * Create pagination response object
 */
export function createPaginationResponse(
  page: number,
  perPage: number,
  totalItems: number
) {
  return {
    page,
    perPage,
    totalItems,
    totalPages: Math.ceil(totalItems / perPage),
  };
}

/**
 * Parse and validate ID from route params
 */
export function parseId(id: string): number {
  const parsed = parseInt(id, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid ID: ${id}`);
  }
  return parsed;
}

/**
 * Parse include string to array of keys
 */
export function parseIncludeString(include?: string): string[] {
  if (!include) return [];
  return include
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

/**
 * Parses an array parameter from the querystring.
 * Handles both array format and single value format.
 * @param value - The value from the querystring (can be array, single value, or undefined).
 * @returns An array of numbers, or undefined if not provided.
 */
export function parseArrayParam(
  value: number | number[] | undefined
): number[] | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value;
  return [value];
}

/**
 * Parse a querystring value into an array of numbers.
 * Handles both `?ids=1,2,3` (comma-separated string) and `?ids=1&ids=2` (repeated param).
 */
export function parseNumArray(v: unknown): number[] {
  if (Array.isArray(v)) {
    return v
      .map((x) => (typeof x === "string" ? parseInt(x, 10) : Number(x)))
      .filter((n) => !isNaN(n));
  }
  if (typeof v === "string") {
    return v
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));
  }
  return [];
}

/**
 * Parse a querystring value into an array of strings.
 * Handles both `?s=a,b,c` (comma-separated string) and `?s=a&s=b` (repeated param).
 */
export function parseStringArray(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v.map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof v === "string") {
    return v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Parse request query into a GroupFixturesFilter object.
 * Returns `undefined` when no filter params were provided.
 */
export function parseGroupFixturesFilter(
  q: Record<string, unknown>
): GroupFixturesFilter | undefined {
  const filter: GroupFixturesFilter = {};

  if (q.next != null) {
    const n =
      typeof q.next === "string" ? parseInt(q.next, 10) : Number(q.next);
    if (!isNaN(n) && n >= 1) filter.next = n;
  }
  if (q.nearestDateOnly != null) {
    const v = q.nearestDateOnly;
    filter.nearestDateOnly =
      v === true || v === "true" || v === "1" || v === 1;
  }
  if (q.leagueIds != null) {
    const arr = parseNumArray(q.leagueIds);
    if (arr.length > 0) filter.leagueIds = arr;
  }
  if (q.teamIds != null) {
    const arr = parseNumArray(q.teamIds);
    if (arr.length > 0) filter.teamIds = arr;
  }
  if (q.fromTs != null) {
    const n =
      typeof q.fromTs === "string"
        ? parseInt(q.fromTs, 10)
        : Number(q.fromTs);
    if (!isNaN(n)) filter.fromTs = n;
  }
  if (q.toTs != null) {
    const n =
      typeof q.toTs === "string" ? parseInt(q.toTs, 10) : Number(q.toTs);
    if (!isNaN(n)) filter.toTs = n;
  }
  if (q.states != null) {
    const arr = parseStringArray(q.states);
    if (arr.length > 0) filter.states = arr;
  }
  if (q.stages != null) {
    const arr = parseStringArray(q.stages);
    if (arr.length > 0) filter.stages = arr;
  }
  if (q.rounds != null) {
    const arr = parseNumArray(q.rounds);
    if (arr.length > 0) filter.rounds = arr;
  }

  return Object.keys(filter).length > 0 ? filter : undefined;
}
