// features/groups/group-teams-selection/group-teams-selection.types.ts
// Type definitions for group teams selection feature.

import type { ApiTeamItem } from "@repo/types";

export type TeamId = number;

/** Selected team data – full team object for display */
export type SelectedTeamData = ApiTeamItem;
