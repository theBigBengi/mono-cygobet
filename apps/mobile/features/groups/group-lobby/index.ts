/**
 * Group Lobby Feature
 *
 * This feature provides components and hooks for managing group lobby screens.
 * Includes components for displaying group details, status, fixtures, privacy settings.
 */

// Screens
export { GroupLobbyActiveScreen } from "./screens/GroupLobbyActiveScreen";
export { GroupLobbyEndedScreen } from "./screens/GroupLobbyEndedScreen";

// Components
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
export { LobbyWithHeader } from "./components/LobbyWithHeader";
export { GroupInfoSheet } from "./components/GroupInfoSheet";
export { GroupEditSheet } from "./components/GroupEditSheet";

// Hooks
export {
  useGroupDuration,
  type GroupDurationResult,
} from "./hooks/useGroupDuration";

// Types
export type { FixtureItem } from "./types";
