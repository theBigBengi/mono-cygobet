// features/groups/group-lobby/components/KORoundModeSelector.tsx
// Component for selecting KO round mode (90min / extra time / penalties).
// Choose when the prediction applies: after 90 minutes, extra time, or penalty shootout.

import React from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable } from "react-native";
import { AppText, Divider } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { CollapsibleSection } from "./CollapsibleSection";

export type KORoundMode = "90min" | "extraTime" | "penalties";

interface KORoundModeSelectorProps {
  /**
   * Current selected KO round mode
   */
  value: KORoundMode;
  /**
   * Callback when KO round mode changes
   */
  onChange: (value: KORoundMode) => void;
  /**
   * Whether the selector is disabled
   */
  disabled?: boolean;
}


/**
 * Component for selecting KO round mode.
 * Shows three options: After 90 minutes, After extra time, After penalty shootout.
 */
export function KORoundModeSelector({
  value,
  onChange,
  disabled = false,
}: KORoundModeSelectorProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  const OPTIONS: { mode: KORoundMode; titleKey: string }[] = [
    { mode: "90min", titleKey: "lobby.after90Minutes" },
    { mode: "extraTime", titleKey: "lobby.afterExtraTime" },
    { mode: "penalties", titleKey: "lobby.afterPenaltyShootout" },
  ];

  const handleSelect = (mode: KORoundMode) => {
    if (disabled) return;
    onChange(mode);
  };

  const found = OPTIONS.find((o) => o.mode === value);
  const selectionLabel = found ? String(t(found.titleKey as any)) : value;

  return (
    <CollapsibleSection
      title={t("lobby.selectKoRoundMode")}
      selectionLabel={selectionLabel}
      description={t("lobby.koRoundDescription")}
    >
      <View style={styles.optionsContainer}>
        {OPTIONS.map(({ mode, titleKey }, index) => {
          const isSelected = value === mode;
          return (
            <React.Fragment key={mode}>
              {index > 0 && <Divider style={styles.divider} />}
              <Pressable
                onPress={() => handleSelect(mode)}
                disabled={disabled}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={({ pressed }) => [
                  styles.optionRow,
                  {
                    opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
                  },
                ]}
              >
                <AppText variant="body" style={styles.optionTitle}>
                  {String(t(titleKey as any))}
                </AppText>
                <Ionicons
                  name={isSelected ? "checkmark-circle" : "radio-button-off"}
                  size={24}
                  color={
                    isSelected ? theme.colors.primary : theme.colors.textSecondary
                  }
                />
              </Pressable>
            </React.Fragment>
          );
        })}
      </View>
    </CollapsibleSection>
  );
}

const styles = StyleSheet.create({
  optionsContainer: {
    gap: 0,
  },
  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  optionTitle: {
    fontWeight: "500",
    flex: 1,
  },
  divider: {
    marginVertical: 0,
  },
});
