// lib/appStart/appStart.run.ts
// App start orchestrator: bootstrap auth and group games.
// User loading is handled separately in AppStartGate after auth state updates.

import type { AuthContextValue } from "@/lib/auth/AuthProvider";
import { bootstrapGroupGames } from "@/features/group-creation/selection/games";

/**
 * Run app start: bootstrap auth and group games.
 * User loading is handled separately in AppStartGate after React state has updated.
 */
export async function runAppStart(auth: AuthContextValue): Promise<void> {
  console.log("AppStart: bootstrap start");

  // Bootstrap auth (determines auth state: authed/guest, does NOT load user)
  // Bootstrap group games in parallel (independent of auth)
  await Promise.all([auth.bootstrap(), bootstrapGroupGames()]);

  console.log("AppStart: bootstrap end");
}
