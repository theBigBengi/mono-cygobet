// lib/appStart/appStart.run.ts
// App start orchestrator: bootstrap auth and group games.
// User loading is handled separately in AppStartGate after auth state updates.

import type { AuthContextValue } from "@/lib/auth/AuthProvider";
import { bootstrapGroupGames } from "@/features/group-creation/selection/games";
import { initHaptics } from "@/lib/haptics";

/**
 * Run app start: bootstrap auth and group games.
 * User loading is handled separately in AppStartGate after React state has updated.
 */
export async function runAppStart(auth: AuthContextValue): Promise<void> {
  // Auth bootstrap is critical - must succeed
  // Group games and haptics are non-critical - failures should not block app start
  const [, nonCriticalResults] = await Promise.all([
    auth.bootstrap(),
    Promise.allSettled([bootstrapGroupGames(), initHaptics()]),
  ]);

  if (__DEV__) {
    for (const result of nonCriticalResults) {
      if (result.status === "rejected") {
        console.warn("AppStart: non-critical bootstrap failed:", result.reason);
      }
    }
  }
}
