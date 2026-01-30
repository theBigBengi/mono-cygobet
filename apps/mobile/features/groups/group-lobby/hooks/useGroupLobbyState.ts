import { useState, useEffect } from "react";
import type { ApiGroupPrivacy, ApiInviteAccess } from "@repo/types";
import type { GroupLobbyState } from "../types";

/**
 * Hook to manage local state for group lobby (draft name, privacy, invite access).
 * Syncs with group data from the query.
 *
 * @param groupName - Current group name from query
 * @param groupPrivacy - Current group privacy from query
 * @param groupInviteAccess - Current group invite access from query
 * @returns State object with draftName, draftPrivacy, draftInviteAccess, and their setters
 */
export function useGroupLobbyState(
  groupName: string | undefined,
  groupPrivacy: ApiGroupPrivacy | undefined,
  groupInviteAccess: ApiInviteAccess | undefined
): {
  draftName: string;
  draftPrivacy: ApiGroupPrivacy;
  draftInviteAccess: ApiInviteAccess;
  setDraftName: (name: string) => void;
  setDraftPrivacy: (privacy: ApiGroupPrivacy) => void;
  setDraftInviteAccess: (inviteAccess: ApiInviteAccess) => void;
} {
  const [draftName, setDraftName] = useState("");
  const [draftPrivacy, setDraftPrivacy] = useState<ApiGroupPrivacy>("private");
  const [draftInviteAccess, setDraftInviteAccess] = useState<ApiInviteAccess>("all");

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

  useEffect(() => {
    if (groupInviteAccess !== undefined) {
      setDraftInviteAccess(groupInviteAccess);
    }
  }, [groupInviteAccess]);

  return {
    draftName,
    draftPrivacy,
    draftInviteAccess,
    setDraftName,
    setDraftPrivacy,
    setDraftInviteAccess,
  };
}
