// lib/settings/useSettings.ts

import { useState, useEffect, useCallback } from "react";
import { getHapticsEnabled, setHapticsEnabled } from "./settings.storage";
import { updateHapticsCache } from "@/lib/haptics";

export function useSettings() {
  const [hapticsEnabled, setHapticsState] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getHapticsEnabled().then((value) => {
      setHapticsState(value);
      setIsLoading(false);
    });
  }, []);

  const toggleHaptics = useCallback(async (value: boolean) => {
    setHapticsState(value);
    await setHapticsEnabled(value);
    updateHapticsCache(value);
  }, []);

  return {
    hapticsEnabled,
    toggleHaptics,
    isLoading,
  };
}
