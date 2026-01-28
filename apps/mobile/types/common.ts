// types/common.ts
// Common types used across multiple features/components in the mobile app.
// These types should be imported from here rather than being defined in feature-specific files.

import type { ApiFixturesListResponse } from "@repo/types";

/**
 * Position of a card within a group of cards.
 * Used for styling cards that appear together (rounded corners, borders, etc.)
 */
export type PositionInGroup = "single" | "top" | "middle" | "bottom";

/**
 * Type alias for a single fixture item from the API response.
 * Used throughout the app for fixture data.
 */
export type FixtureItem = ApiFixturesListResponse["data"][0];

/**
 * Type alias for fixture ID.
 * Used for identifying fixtures across the app.
 */
export type FixtureId = number;
