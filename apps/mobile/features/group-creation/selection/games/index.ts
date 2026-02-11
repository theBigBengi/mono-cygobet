// features/group-creation/selection/games/index.ts
// Barrel export for group games selection feature.

export { bootstrapGroupGames } from "./bootstrap";
export {
  useIsGroupGameSelected,
  useToggleGroupGame,
  useAddMultipleGroupGames,
  useRemoveMultipleGroupGames,
  useAreAllGamesSelected,
  useSelectedGroupGames,
  useClearGroupGamesHook,
  useGroupGamesHydrated,
} from "./hooks";
export type {
  FixtureId,
  SelectedGameData,
  GroupGamesState,
  GroupGamesStorageEnvelope,
  GroupPrediction,
  GroupPredictionsStorageEnvelope,
} from "./types";
export * from "./components";
