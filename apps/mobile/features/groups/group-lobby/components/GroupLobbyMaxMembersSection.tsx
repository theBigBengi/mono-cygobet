// features/groups/group-lobby/components/GroupLobbyMaxMembersSection.tsx
// Component for configuring maximum number of members in a group.
// Allows editing the max members value with increment/decrement controls.

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable } from "react-native";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { CollapsibleSection } from "./CollapsibleSection";

interface GroupLobbyMaxMembersSectionProps {
  /**
   * Initial value for max members
   * @default 50
   */
  initialMaxMembers?: number;
  /**
   * Callback when max members value changes
   */
  onChange?: (maxMembers: number) => void;
  /**
   * Whether the controls are disabled
   */
  disabled?: boolean;
}

const MIN_MEMBERS = 2;
const MAX_MEMBERS = 100;
const PRESET_OPTIONS = [10, 20, 30, 50, 100];

/**
 * Component for displaying and editing maximum members setting.
 * Shows current value with increment/decrement controls and preset options.
 */
export function GroupLobbyMaxMembersSection({
  initialMaxMembers = 50,
  onChange,
  disabled = false,
}: GroupLobbyMaxMembersSectionProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const [maxMembers, setMaxMembers] = useState(initialMaxMembers);

  const handleValueChange = (delta: number) => {
    if (disabled) return;

    const newValue = Math.min(MAX_MEMBERS, Math.max(MIN_MEMBERS, maxMembers + delta));
    setMaxMembers(newValue);
    onChange?.(newValue);
  };

  const handlePresetSelect = (value: number) => {
    if (disabled) return;

    setMaxMembers(value);
    onChange?.(value);
  };

  const selectionLabel = t("lobby.maxMembersLabel", { count: maxMembers });
  const description = t("lobby.groupSizeDescription");

  return (
    <CollapsibleSection
      title={t("lobby.groupSize")}
      selectionLabel={selectionLabel}
      description={description}
    >
      <View style={styles.content}>
        {/* Main counter control */}
        <View style={styles.counterRow}>
          <AppText variant="body" style={styles.label}>
            {t("lobby.maxMembers")}
          </AppText>
          <View style={styles.counterControls}>
            <Pressable
              onPress={() => handleValueChange(-5)}
              disabled={disabled || maxMembers <= MIN_MEMBERS}
              style={({ pressed }) => [
                styles.controlButton,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  opacity: disabled || maxMembers <= MIN_MEMBERS ? 0.5 : pressed ? 0.7 : 1,
                },
              ]}
            >
              <Ionicons
                name="remove"
                size={16}
                color={theme.colors.textPrimary}
              />
            </Pressable>
            <AppText variant="body" style={styles.counterValue}>
              {maxMembers}
            </AppText>
            <Pressable
              onPress={() => handleValueChange(5)}
              disabled={disabled || maxMembers >= MAX_MEMBERS}
              style={({ pressed }) => [
                styles.controlButton,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  opacity: disabled || maxMembers >= MAX_MEMBERS ? 0.5 : pressed ? 0.7 : 1,
                },
              ]}
            >
              <Ionicons
                name="add"
                size={16}
                color={theme.colors.textPrimary}
              />
            </Pressable>
          </View>
        </View>

        {/* Preset options */}
        <View style={styles.presetsContainer}>
          <AppText variant="caption" color="secondary" style={styles.presetsLabel}>
            Quick select:
          </AppText>
          <View style={styles.presetsRow}>
            {PRESET_OPTIONS.map((preset) => (
              <Pressable
                key={preset}
                onPress={() => handlePresetSelect(preset)}
                disabled={disabled}
                style={({ pressed }) => [
                  styles.presetButton,
                  {
                    backgroundColor:
                      maxMembers === preset
                        ? theme.colors.primary
                        : theme.colors.surface,
                    borderColor:
                      maxMembers === preset
                        ? theme.colors.primary
                        : theme.colors.border,
                    opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
                  },
                ]}
              >
                <AppText
                  variant="caption"
                  style={[
                    styles.presetText,
                    {
                      color:
                        maxMembers === preset
                          ? theme.colors.primaryText
                          : theme.colors.textPrimary,
                    },
                  ]}
                >
                  {preset}
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </CollapsibleSection>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
  },
  counterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  label: {
    fontWeight: "500",
    flex: 1,
  },
  counterControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  controlButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  counterValue: {
    fontWeight: "600",
    minWidth: 32,
    textAlign: "center",
  },
  presetsContainer: {
    gap: 8,
  },
  presetsLabel: {
    marginBottom: 4,
  },
  presetsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  presetButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  presetText: {
    fontWeight: "500",
  },
});
