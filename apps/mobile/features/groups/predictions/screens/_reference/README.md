# GroupGamesScreen — Timeline Layout (Reference)

Saved: 2026-02-25

## What is this?
A working copy of GroupGamesScreen + MatchPredictionCardVertical with the **vertical timeline layout**.
Save this as a reference to restore or reuse in other screens.

## Layout
- Vertical timeline on the left (track + filled progress + waypoint badges)
- Cards to the right of the timeline
- Section headers (league/date) span the timeline column
- Collapsing header on scroll (only user drag, not programmatic navigation)
- Floating "scroll to next" button on the timeline

## Key files (saved here)
- `GroupGamesScreen.tsx` — FlatList orchestration, scroll handler, header collapse, renderItem
- `MatchPredictionCardVertical.tsx` — Card UI with timeline column, score inputs, reveal animation

## Dependencies (not copied — still in their original locations)
- `hooks/usePredictionNavigation.ts` — field ordering, focus tracking, prev/next, scroll-to-card
- `hooks/useGroupPredictions.ts` — prediction state (React Query), save, pending
- `hooks/useCardFocusSaving.ts` — focus/blur handling with navigation guard
- `hooks/useKeyboardHeight.ts` — keyboard height tracking
- `hooks/useMatchCardState.ts` — derived card state (editable, live, finished, focused)
- `hooks/useSmartFilters.ts` — filter chips (teams, rounds, actions)
- `hooks/useGroupedFixtures.ts` — fixture grouping by league/date
- `hooks/usePredictionsStats.ts` — summary stats for footer
- `components/GroupFixtureCard.tsx` — React.memo wrapper with custom arePropsEqual
- `components/ScoreInput.tsx` — score input field with hidden TextInput pattern
- `components/GroupGamesHeader.tsx` — collapsing header with filter panel

## Patterns used
- **Ref-bridges**: hot state stored in refs, read inside stable useCallback (renderItem stays stable)
- **extraData**: triggers FlatList re-calls when hot state changes; React.memo prevents unnecessary card re-renders
- **isUserDragging SharedValue**: distinguishes user scroll from programmatic scroll in animated scroll handler
- **Scroll reveal**: per-card useAnimatedReaction + withSpring, skipped for already-revealed cards via module-level Set
- **O(1) lookups**: fieldIndexMap for navigation, fixturesById for fixture lookup

## How to restore
Replace the current `GroupGamesScreen.tsx` and `MatchPredictionCardVertical.tsx` with these copies.
All hooks and other components are shared and don't need restoration.
