import { useCallback } from "react";
import type { ApiGroupPrivacy } from "@repo/types";
import type { UseMutationResult } from "@tanstack/react-query";

/**
 * Hook to handle group lobby actions (publish, etc.).
 *
 * @param publishGroupMutation - React Query mutation for publishing a group
 * @param draftName - Current draft name
 * @param draftPrivacy - Current draft privacy
 * @returns Action handlers
 */
export function useGroupLobbyActions(
  publishGroupMutation: UseMutationResult<
    unknown,
    unknown,
    { name?: string; privacy?: ApiGroupPrivacy }
  >,
  draftName: string,
  draftPrivacy: ApiGroupPrivacy
): {
  handlePublish: () => Promise<void>;
} {
  const handlePublish = useCallback(async () => {
    const nextName = draftName.trim();
    if (!nextName) return;

    // Always send current name and privacy to ensure they're saved during publish
    const body: { name?: string; privacy?: ApiGroupPrivacy } = {
      name: nextName,
      privacy: draftPrivacy,
    };

    try {
      await publishGroupMutation.mutateAsync(body);
      // After success, original values will refresh via query invalidation
    } catch {
      // Error handled by mutation; UI can retry by pressing Publish again
    }
  }, [draftName, draftPrivacy, publishGroupMutation]);

  return {
    handlePublish,
  };
}
