// features/group-creation/components/CreateSheetDetailsStep.tsx
// Extracted step 1 (group details form) from CreateGroupFlow.tsx

import React from "react";
import { View, Pressable, TextInput, ActivityIndicator, type ViewStyle } from "react-native";
import Animated, { type AnimatedStyleProp } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { AppText, GroupAvatar } from "@/components/ui";
import { createStyles } from "./createGroupFlow.styles";
import type { Theme } from "@/lib/theme/theme.types";

interface CreateSheetDetailsStepProps {
  onOpenAvatarPicker: () => void;
  avatarValue: string;
  groupName: string;
  setGroupName: (val: string) => void;
  groupDescription: string;
  setGroupDescription: (val: string) => void;
  handleCreateAndPublish: () => void;
  isCreating: boolean;
  theme: Theme;
  groupNameInputRef: React.RefObject<TextInput>;
  descInputRef: React.RefObject<TextInput>;
  step1AnimStyle: AnimatedStyleProp<ViewStyle>;
}

export function CreateSheetDetailsStep({
  onOpenAvatarPicker,
  avatarValue,
  groupName,
  setGroupName,
  groupDescription,
  setGroupDescription,
  handleCreateAndPublish,
  isCreating,
  theme,
  groupNameInputRef,
  descInputRef,
  step1AnimStyle,
}: CreateSheetDetailsStepProps) {
  const { t } = useTranslation("common");

  return (
    <Animated.View style={step1AnimStyle}>
    {/* Step 1: Group Details */}
    <View style={{ flex: 1, paddingHorizontal: theme.spacing.ml }}>
      <View style={{ flex: 3 }} />
      <Pressable onPress={onOpenAvatarPicker} style={createStyles.avatarPicker}>
        <GroupAvatar
          avatarType="gradient"
          avatarValue={avatarValue}
          initials={groupName.trim() ? groupName.trim().substring(0, 2) : "Gr"}
          size={96}
          borderRadius={26}
          flat
        />
        <View style={[createStyles.avatarEditBadge, { backgroundColor: theme.colors.background }]}>
          <Ionicons name="color-palette-outline" size={14} color={theme.colors.textSecondary} />
        </View>
      </Pressable>
      <View style={createStyles.fieldGroup}>
        <TextInput
          style={[
            createStyles.fieldInput,
            {
              color: theme.colors.textPrimary,
              backgroundColor: theme.colors.textPrimary + "08",
            },
          ]}
          placeholder={t("groupCreation.groupNamePlaceholder")}
          placeholderTextColor={theme.colors.textSecondary + "60"}
          value={groupName}
          onChangeText={setGroupName}
          ref={groupNameInputRef}
          maxLength={40}
          selectTextOnFocus
        />
        <TextInput
          style={[
            createStyles.descInput,
            { color: theme.colors.textPrimary, backgroundColor: theme.colors.textPrimary + "08" },
          ]}
          placeholder={t("lobby.descriptionPlaceholder")}
          placeholderTextColor={theme.colors.textSecondary + "50"}
          value={groupDescription}
          onChangeText={setGroupDescription}
          ref={descInputRef}
          maxLength={200}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>
      {/* Create button */}
      <Pressable
        onPress={handleCreateAndPublish}
        disabled={isCreating || groupName.trim().length === 0}
        style={({ pressed }) => [
          createStyles.continueBottomBtn,
          {
            borderColor: groupName.trim().length > 0 && !isCreating
              ? theme.colors.primary + "40"
              : theme.colors.textSecondary + "20",
            marginTop: theme.spacing.lg,
            marginBottom: 0,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        {isCreating ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <>
            <AppText variant="caption" style={{ color: groupName.trim().length > 0 ? theme.colors.primary : theme.colors.textSecondary + "60", fontWeight: "600", fontSize: 13 }}>
              {t("groupCreation.createGroup")}
            </AppText>
            <Ionicons name="arrow-forward" size={14} color={groupName.trim().length > 0 ? theme.colors.primary : theme.colors.textSecondary + "60"} />
          </>
        )}
      </Pressable>
      <View style={{ flex: 5 }} />
    </View>
    </Animated.View>
  );
}
