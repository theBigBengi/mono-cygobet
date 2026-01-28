import type { ApiGroupPrivacy } from "@repo/types";

// Re-export common types for convenience
export type { FixtureItem } from "@/types/common";

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
