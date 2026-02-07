/**
 * Group Lobby Feature
 *
 * This feature provides components and hooks for managing group lobby screens.
 * Includes components for displaying group details, status, fixtures, privacy settings,
 * and actions like publishing a group.
 */

// Screens
export { GroupLobbyDraftScreen } from "./screens/GroupLobbyDraftScreen";
export { GroupLobbyActiveScreen } from "./screens/GroupLobbyActiveScreen";
export { GroupLobbyEndedScreen } from "./screens/GroupLobbyEndedScreen";

// Components
export { GroupLobbyNameHeader } from "./components/GroupLobbyNameHeader";
export { GroupLobbyStatusCard } from "./components/GroupLobbyStatusCard";
export { GroupLobbyScoringSection } from "./components/GroupLobbyScoringSection";
export { GroupLobbyMaxMembersSection } from "./components/GroupLobbyMaxMembersSection";
export {
  PredictionModeSelector,
  type PredictionMode,
} from "./components/PredictionModeSelector";
export {
  KORoundModeSelector,
  type KORoundMode,
} from "./components/KORoundModeSelector";
export { GroupLobbyFixtureCard } from "./components/GroupLobbyFixtureCard";
export { GroupLobbyFixturesSection } from "./components/GroupLobbyFixturesSection";
export { GroupLobbyPrivacySection } from "./components/GroupLobbyPrivacySection";
export { GroupLobbyInviteAccessSection } from "./components/GroupLobbyInviteAccessSection";
export { GroupLobbyMetaSection } from "./components/GroupLobbyMetaSection";
export { PublishGroupButton } from "./components/PublishGroupButton";
export { DeleteGroupButton } from "./components/DeleteGroupButton";
export { LobbyWithHeader } from "./components/LobbyWithHeader";

// Hooks
export { useGroupLobbyState } from "./hooks/useGroupLobbyState";
export { useGroupLobbyActions } from "./hooks/useGroupLobbyActions";
export {
  useGroupDuration,
  type GroupDurationResult,
} from "./hooks/useGroupDuration";

// Types
export type { FixtureItem, GroupLobbyState, GroupLobbyActions } from "./types";
