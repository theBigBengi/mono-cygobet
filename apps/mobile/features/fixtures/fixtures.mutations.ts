// React Query mutations for fixtures feature.
// - Placeholder for future write operations (e.g., bookmarking, preferences).
// - All fixtures mutations should invalidate fixturesKeys as appropriate.

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fixturesKeys } from "./fixtures.keys";

export function useDummyFixturesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    // mutationFn: async (input: YourPayloadType) => { ... },
    onSuccess: () => {
      // Example: invalidate both public and protected upcoming feeds
      queryClient.invalidateQueries({ queryKey: fixturesKeys.all });
    },
  });
}


