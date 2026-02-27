import { useState, useEffect } from "react";
import type { ApiGroupPrivacy, ApiInviteAccess } from "@repo/types";

/**
 * Hook to manage local state for group lobby (draft name, description, privacy, invite access, avatar).
 * Syncs with group data from the query.
 */
export function useGroupLobbyState(
  groupName: string | undefined,
  groupDescription: string | undefined | null,
  groupPrivacy: ApiGroupPrivacy | undefined,
  groupInviteAccess: ApiInviteAccess | undefined,
  groupAvatarType?: string | null,
  groupAvatarValue?: string | null
): {
  draftName: string;
  draftDescription: string;
  draftPrivacy: ApiGroupPrivacy;
  draftInviteAccess: ApiInviteAccess;
  draftAvatarType: string;
  draftAvatarValue: string;
  setDraftName: (name: string) => void;
  setDraftDescription: (description: string) => void;
  setDraftPrivacy: (privacy: ApiGroupPrivacy) => void;
  setDraftInviteAccess: (inviteAccess: ApiInviteAccess) => void;
  setDraftAvatarType: (avatarType: string) => void;
  setDraftAvatarValue: (avatarValue: string) => void;
} {
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftPrivacy, setDraftPrivacy] = useState<ApiGroupPrivacy>("private");
  const [draftInviteAccess, setDraftInviteAccess] =
    useState<ApiInviteAccess>("all");
  const [draftAvatarType, setDraftAvatarType] = useState("gradient");
  const [draftAvatarValue, setDraftAvatarValue] = useState("0");

  // Sync local state when group data changes
  useEffect(() => {
    if (groupName !== undefined) {
      setDraftName(groupName);
    }
  }, [groupName]);

  useEffect(() => {
    if (groupDescription !== undefined && groupDescription !== null) {
      setDraftDescription(groupDescription);
    }
  }, [groupDescription]);

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

  useEffect(() => {
    if (groupAvatarType !== undefined && groupAvatarType !== null) {
      setDraftAvatarType(groupAvatarType);
    }
  }, [groupAvatarType]);

  useEffect(() => {
    if (groupAvatarValue !== undefined && groupAvatarValue !== null) {
      setDraftAvatarValue(groupAvatarValue);
    }
  }, [groupAvatarValue]);

  return {
    draftName,
    draftDescription,
    draftPrivacy,
    draftInviteAccess,
    draftAvatarType,
    draftAvatarValue,
    setDraftName,
    setDraftDescription,
    setDraftPrivacy,
    setDraftInviteAccess,
    setDraftAvatarType,
    setDraftAvatarValue,
  };
}
