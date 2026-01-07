// React Query mutations for the profile feature.
// - All profile writes/updates should be colocated here.
// - Each mutation is responsible for invalidating the correct profile keys.

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { profileKeys } from "./profile.keys";

// Example skeleton (not wired to any endpoint yet).
// When a real mutation is added, replace the commented mutationFn.
export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    // mutationFn: async (input: YourUpdatePayload) => {
    //   // TODO: call profile API mutation function here
    // },
    onSuccess: () => {
      // Invalidate profile query so it refetches fresh data
      queryClient.invalidateQueries({ queryKey: profileKeys.me() });
    },
  });
}
