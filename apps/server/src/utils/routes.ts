// src/utils/routes.ts
// Utility functions for route handlers

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
