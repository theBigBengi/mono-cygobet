import { useState, useEffect } from "react";
import type { ApiGroupPrivacy } from "@repo/types";
import type { GroupLobbyState } from "../types";

/**
 * Hook to manage local state for group lobby (draft name and privacy).
 * Syncs with group data from the query.
 *
 * @param groupName - Current group name from query
 * @param groupPrivacy - Current group privacy from query
 * @returns State object with draftName, draftPrivacy, and their setters
 */
export function useGroupLobbyState(
  groupName: string | undefined,
  groupPrivacy: ApiGroupPrivacy | undefined
): {
  draftName: string;
  draftPrivacy: ApiGroupPrivacy;
  setDraftName: (name: string) => void;
  setDraftPrivacy: (privacy: ApiGroupPrivacy) => void;
} {
  const [draftName, setDraftName] = useState("");
  const [draftPrivacy, setDraftPrivacy] = useState<ApiGroupPrivacy>("private");

  // Sync local state when group data changes
  useEffect(() => {
    if (groupName !== undefined) {
      setDraftName(groupName);
    }
  }, [groupName]);

  useEffect(() => {
    if (groupPrivacy !== undefined) {
      setDraftPrivacy(groupPrivacy);
    }
  }, [groupPrivacy]);

  return {
    draftName,
    draftPrivacy,
    setDraftName,
    setDraftPrivacy,
  };
}
