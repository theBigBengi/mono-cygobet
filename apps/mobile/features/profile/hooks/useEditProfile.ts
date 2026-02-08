// features/profile/hooks/useEditProfile.ts
// Hook encapsulating edit profile form state, validation, and mutation.

import { useState, useEffect, useCallback } from "react";
import { Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { useUpdateProfileMutation } from "../profile.mutations";

const USERNAME_REGEX = /^[\u0590-\u05FFa-zA-Z0-9_-]+$/;

interface UseEditProfileOptions {
  visible: boolean;
  currentUsername: string | null;
  currentName: string | null;
  onClose: () => void;
}

export function useEditProfile({
  visible,
  currentUsername,
  currentName,
  onClose,
}: UseEditProfileOptions) {
  const { t } = useTranslation("common");
  const mutation = useUpdateProfileMutation();

  const [username, setUsername] = useState(currentUsername ?? "");
  const [name, setName] = useState(currentName ?? "");

  useEffect(() => {
    if (visible) {
      setUsername(currentUsername ?? "");
      setName(currentName ?? "");
    }
  }, [visible, currentUsername, currentName]);

  const initials = (username || "U").slice(0, 1).toUpperCase();

  const handleSave = useCallback(() => {
    if (username.length < 3) {
      Alert.alert(t("errors.error"), t("auth.errorUsernameMin"));
      return;
    }
    if (username.length > 50) {
      Alert.alert(t("errors.error"), t("auth.errorUsernameMax"));
      return;
    }
    if (!USERNAME_REGEX.test(username)) {
      Alert.alert(t("errors.error"), t("auth.errorUsernameFormat"));
      return;
    }

    const updates: { username?: string; name?: string } = {};
    if (username !== (currentUsername ?? "")) updates.username = username;
    if (name !== (currentName ?? "")) updates.name = name || undefined;

    if (Object.keys(updates).length === 0) {
      onClose();
      return;
    }

    mutation.mutate(updates, {
      onSuccess: () => {
        onClose();
      },
      onError: (error) => {
        Alert.alert(
          t("errors.error"),
          error.message || t("editProfile.updateFailed")
        );
      },
    });
  }, [username, name, currentUsername, currentName, mutation, onClose, t]);

  return {
    username,
    name,
    initials,
    setUsername,
    setName,
    handleSave,
    isSaving: mutation.isPending,
  };
}
