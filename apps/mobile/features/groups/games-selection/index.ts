// features/group-games-selection/index.ts
// Barrel export for group games selection feature.

export { bootstrapGroupGames } from "./group-games-selection.bootstrap";
export {
  useIsGroupGameSelected,
  useToggleGroupGame,
  useSelectedGroupGames,
  useClearGroupGamesHook,
  useGroupGamesHydrated,
} from "./group-games-selection.hooks";
export type {
  FixtureId,
  SelectedGameData,
  GroupGamesState,
  GroupGamesStorageEnvelope,
} from "./group-games-selection.types";
