import type { ApiGroupPrivacy, ApiFixturesListResponse } from "@repo/types";

/**
 * Type alias for a single fixture item from the API response.
 */
export type FixtureItem = ApiFixturesListResponse["data"][0];

/**
 * Props for components that need group lobby state.
 */
export interface GroupLobbyState {
  draftName: string;
  draftPrivacy: ApiGroupPrivacy;
}

/**
 * Props for components that handle group lobby actions.
 */
export interface GroupLobbyActions {
  onPublish: (name: string, privacy: ApiGroupPrivacy) => Promise<void>;
}
