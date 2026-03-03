import {
  isFinished as isFinishedState,
  isLive as isLiveState,
} from "@repo/utils";
import type { FixtureItem, RenderItem } from "../types";
import type { FixtureGroup } from "../hooks/useGroupedFixtures";

/**
 * Build the flat render list (headers + cards) from fixture groups,
 * computing timeline fill state for each item.
 */
export function buildRenderItems(fixtureGroups: FixtureGroup[]): RenderItem[] {
  // 1. Flatten all fixtures to compute progress front
  const allFixtures: FixtureItem[] = [];
  fixtureGroups.forEach((g) =>
    g.fixtures.forEach((f) => allFixtures.push(f))
  );

  let lastFinishedIdx = -1;
  for (let i = allFixtures.length - 1; i >= 0; i--) {
    const state = allFixtures[i].state;
    if (state && isFinishedState(state)) {
      lastFinishedIdx = i;
      break;
    }
  }

  // Extend fill to the first live match (line reaches it but doesn't fill through)
  let firstLiveIdx = -1;
  const searchFrom = lastFinishedIdx >= 0 ? lastFinishedIdx + 1 : 0;
  if (searchFrom < allFixtures.length) {
    const nextState = allFixtures[searchFrom].state;
    if (nextState && isLiveState(nextState)) {
      firstLiveIdx = searchFrom;
    }
  }

  const lastFilledIdx = firstLiveIdx >= 0 ? firstLiveIdx : lastFinishedIdx;

  // Per-fixture timeline state
  const filled: Record<number, boolean> = {};
  const connector: Record<number, boolean> = {};
  allFixtures.forEach((f, i) => {
    filled[f.id] = i <= lastFilledIdx;
    connector[f.id] =
      i < lastFilledIdx &&
      i < (firstLiveIdx >= 0 ? firstLiveIdx : lastFilledIdx + 1);
  });

  // 2. Build flat render list
  const items: RenderItem[] = [];
  for (const group of fixtureGroups) {
    if (group.fixtures.length === 0 && group.label) {
      items.push({
        type: "header",
        key: group.key,
        label: group.dateLabel || group.label,
        level: "date",
        isLive: group.isLive,
        showTrack: false,
        isFilled: false,
      });
    } else if (group.fixtures.length > 0 && group.label) {
      items.push({
        type: "header",
        key: `header-${group.key}`,
        label: group.label,
        level: group.level ?? "league",
        isLive: group.isLive,
        round: group.fixtures[0]?.round,
        showTrack: false,
        isFilled: false,
      });
    }
    for (let i = 0; i < group.fixtures.length; i++) {
      items.push({
        type: "card",
        fixture: group.fixtures[i],
        group,
        indexInGroup: i,
        timelineFilled: filled[group.fixtures[i].id] ?? false,
        timelineConnectorFilled: connector[group.fixtures[i].id] ?? false,
        isFirstInTimeline: false,
        isLastInTimeline: false,
      });
    }
  }

  // 3. Compute timeline state for every item (single O(n) pass)
  let seenFirstCard = true;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (item.type === "header") {
      item.showTrack = seenFirstCard;
      let nextFilled = false;
      for (let j = i + 1; j < items.length; j++) {
        if (items[j].type === "card") {
          nextFilled = (items[j] as any).timelineFilled;
          break;
        }
      }
      item.isFilled = nextFilled;
    } else {
      item.isFirstInTimeline = !seenFirstCard;
      item.isLastInTimeline = i === items.length - 1;
      seenFirstCard = true;
    }
  }

  return items;
}
