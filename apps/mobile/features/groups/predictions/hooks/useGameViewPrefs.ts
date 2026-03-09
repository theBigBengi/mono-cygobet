// hooks/useGameViewPrefs.ts
// Persisted global preferences for the games screen display.
// Shared across all groups — layout and name style saved to AsyncStorage.

import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "game_view_prefs";

type CardLayout = "vertical" | "horizontal";

interface GameViewPrefs {
  cardLayout: CardLayout;
  /** Full names vs short codes — stored per layout mode */
  useFullNameVertical: boolean;
  useFullNameHorizontal: boolean;
}

const DEFAULTS: GameViewPrefs = {
  cardLayout: "vertical",
  useFullNameVertical: true,
  useFullNameHorizontal: false,
};

let cachedPrefs: GameViewPrefs | null = null;
const listeners = new Set<(prefs: GameViewPrefs) => void>();

function notify(prefs: GameViewPrefs) {
  cachedPrefs = prefs;
  for (const fn of listeners) fn(prefs);
}

export function useGameViewPrefs() {
  const [prefs, setPrefs] = useState<GameViewPrefs>(cachedPrefs ?? DEFAULTS);

  useEffect(() => {
    // Load from storage on first mount
    if (!cachedPrefs) {
      AsyncStorage.getItem(STORAGE_KEY).then((val) => {
        if (val) {
          try {
            const parsed = { ...DEFAULTS, ...JSON.parse(val) };
            notify(parsed);
          } catch {}
        }
      });
    }

    listeners.add(setPrefs);
    return () => { listeners.delete(setPrefs); };
  }, []);

  const update = useCallback((patch: Partial<GameViewPrefs>) => {
    const next = { ...prefs, ...patch };
    notify(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, [prefs]);

  const toggleCardLayout = useCallback(() => {
    const next: CardLayout = prefs.cardLayout === "vertical" ? "horizontal" : "vertical";
    update({ cardLayout: next });
  }, [prefs.cardLayout, update]);

  const toggleFullName = useCallback(() => {
    if (prefs.cardLayout === "vertical") {
      update({ useFullNameVertical: !prefs.useFullNameVertical });
    } else {
      update({ useFullNameHorizontal: !prefs.useFullNameHorizontal });
    }
  }, [prefs, update]);

  const useFullName = prefs.cardLayout === "vertical"
    ? prefs.useFullNameVertical
    : prefs.useFullNameHorizontal;

  return {
    cardLayout: prefs.cardLayout,
    useFullName,
    toggleCardLayout,
    toggleFullName,
  };
}
