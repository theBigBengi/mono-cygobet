// features/groups/group-leagues-selection/group-leagues-selection.types.ts
// Type definitions for group leagues selection feature.

import type { ApiLeagueItem } from "@repo/types";

export type LeagueId = number;

/** Selected league data – full league object for display */
export type SelectedLeagueData = ApiLeagueItem;
