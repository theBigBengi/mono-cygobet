// lib/appStart/appStart.run.ts
// App start orchestrator: bootstrap auth, picks, and group games.
// User loading is handled separately in AppStartGate after auth state updates.

import type { AuthContextValue } from "@/lib/auth/AuthProvider";
import { bootstrapPicks } from "@/features/picks";
import { bootstrapGroupGames } from "@/features/groups/games-selection";

/**
 * Run app start: bootstrap auth, picks, and group games.
 * User loading is handled separately in AppStartGate after React state has updated.
 */
export async function runAppStart(auth: AuthContextValue): Promise<void> {
  console.log("AppStart: bootstrap start");

  // Bootstrap auth (determines auth state: authed/guest, does NOT load user)
  // Bootstrap picks and group games in parallel (independent of auth)
  await Promise.all([
    auth.bootstrap(),
    bootstrapPicks(),
    bootstrapGroupGames(),
  ]);

  console.log("AppStart: bootstrap end");
}
