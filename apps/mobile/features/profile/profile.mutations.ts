// React Query mutations for the profile feature.
// - All profile writes/updates should be colocated here.
// - Each mutation is responsible for invalidating the correct profile keys.

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProfile, type UpdateProfileInput } from "./profile.api";
import { profileKeys } from "./profile.keys";

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProfileInput) => updateProfile(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: profileKeys.all });
    },
  });
}
