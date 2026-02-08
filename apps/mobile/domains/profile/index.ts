// domains/profile/index.ts
// Public exports for profile domain.

export {
  useProfileQuery,
  useUserStatsQuery,
  useHeadToHeadQuery,
  useH2HOpponentsQuery,
} from "./profile.queries";

export { useUpdateProfileMutation } from "./profile.mutations";

export { useGamificationQuery } from "./profile-gamification.queries";

export { profileKeys } from "./profile.keys";

export {
  fetchProfile,
  fetchUserStats,
  fetchHeadToHead,
  fetchH2HOpponents,
  fetchGamification,
  updateProfile,
} from "./profile.api";
export type { UpdateProfileInput } from "./profile.api";
