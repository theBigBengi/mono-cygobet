// features/groups/group-lobby/hooks/useAutoSaveDraft.ts
// Debounced auto-save of draft settings to the server.
// Only saves fields supported by ApiUpdateGroupBody: name, description, privacy,
// inviteAccess, nudgeEnabled, nudgeWindowMinutes.

import { useRef, useEffect } from "react";
import type { ApiGroupPrivacy, ApiInviteAccess } from "@repo/types";
import { useUpdateGroupMutation } from "@/domains/groups";

const DEBOUNCE_MS = 800;

interface DraftValues {
  name: string;
  description: string;
  privacy: ApiGroupPrivacy;
  inviteAccess: ApiInviteAccess;
  nudgeEnabled: boolean;
  nudgeWindowMinutes: number;
}

function valuesEqual(a: DraftValues, b: DraftValues): boolean {
  return (
    a.name === b.name &&
    a.description === b.description &&
    a.privacy === b.privacy &&
    a.inviteAccess === b.inviteAccess &&
    a.nudgeEnabled === b.nudgeEnabled &&
    a.nudgeWindowMinutes === b.nudgeWindowMinutes
  );
}

export function useAutoSaveDraft(
  groupId: number,
  values: DraftValues,
  enabled: boolean
) {
  const updateGroupMutation = useUpdateGroupMutation(groupId);
  const lastSavedRef = useRef<DraftValues | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  // Keep a stable ref to the mutation so the debounce effect doesn't
  // need it in its dependency array (which would reset the timer every render).
  const mutationRef = useRef(updateGroupMutation);
  mutationRef.current = updateGroupMutation;

  useEffect(() => {
    if (!enabled) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      const current = valuesRef.current;
      if (mutationRef.current.isPending) return;
      if (lastSavedRef.current && valuesEqual(current, lastSavedRef.current)) {
        return;
      }

      const body = {
        name: current.name.trim() || undefined,
        description: current.description.trim() || undefined,
        privacy: current.privacy,
        inviteAccess: current.inviteAccess,
        nudgeEnabled: current.nudgeEnabled,
        nudgeWindowMinutes: current.nudgeWindowMinutes,
      };

      mutationRef.current.mutate(body, {
        onSuccess: () => {
          lastSavedRef.current = { ...valuesRef.current };
        },
      });
    }, DEBOUNCE_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [
    values.name,
    values.description,
    values.privacy,
    values.inviteAccess,
    values.nudgeEnabled,
    values.nudgeWindowMinutes,
    enabled,
  ]);

  // Initialize lastSavedRef on mount when we have initial values
  useEffect(() => {
    if (lastSavedRef.current === null && enabled) {
      lastSavedRef.current = { ...values };
    }
  }, [enabled, values]);
}
