// features/group-creation/selection/teams/types.ts
// Type definitions for group teams selection feature.

import type { ApiTeamItem } from "@repo/types";

export type TeamId = number;

/** Selected team data – full team object for display */
export type SelectedTeamData = ApiTeamItem;
