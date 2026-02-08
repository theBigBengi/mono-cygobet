// features/settings/components/SettingsRowPicker.tsx

import React, { useState } from "react";
import { View, Modal, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import type { PickerOption } from "./SettingsRowBottomSheet";
import { settingsSharedStyles } from "./settingsStyles";

interface SettingsRowPickerProps<T> {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  value: T;
  options: PickerOption<T>[];
  onValueChange: (value: T) => void;
  isLast?: boolean;
}

export function SettingsRowPicker<T extends string>({
  icon,
  label,
  value,
  options,
  onValueChange,
  isLast = false,
}: SettingsRowPickerProps<T>) {
  const { theme } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOption = options.find((o) => o.value === value);

  return (
    <>
      <Pressable
        onPress={() => setModalVisible(true)}
        style={({ pressed }) => [
          settingsSharedStyles.row,
          {
            paddingVertical: theme.spacing.md,
            paddingHorizontal: theme.spacing.md,
            borderBottomWidth: isLast ? 0 : 1,
            borderBottomColor: theme.colors.border,
            backgroundColor: pressed ? theme.colors.border : "transparent",
          },
        ]}
      >
        {icon && (
          <View
            style={[
              settingsSharedStyles.iconContainer,
              {
                backgroundColor: theme.colors.primary,
                borderRadius: theme.radius.sm,
                marginEnd: theme.spacing.sm,
              },
            ]}
          >
            <Ionicons name={icon} size={18} color={theme.colors.primaryText} />
          </View>
        )}
        <View style={settingsSharedStyles.labelContainer}>
          <AppText variant="body" style={settingsSharedStyles.label}>
            {label}
          </AppText>
        </View>
        <AppText variant="body" color="secondary">
          {selectedOption?.label ?? ""}
        </AppText>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={theme.colors.textSecondary}
          style={{ marginStart: 4 }}
        />
      </Pressable>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setModalVisible(false)}
        presentationStyle="pageSheet"
      >
        <View
          style={[styles.modal, { backgroundColor: theme.colors.background }]}
        >
          <View
            style={[styles.header, { borderBottomColor: theme.colors.border }]}
          >
            <Pressable
              onPress={() => setModalVisible(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="close"
                size={28}
                color={theme.colors.textSecondary}
              />
            </Pressable>
            <AppText variant="subtitle" style={styles.headerTitle}>
              {label}
            </AppText>
            <View style={{ width: 28 }} />
          </View>

          <View style={styles.optionsList}>
            {options.map((option, index) => (
              <Pressable
                key={option.value}
                onPress={() => {
                  onValueChange(option.value);
                  setModalVisible(false);
                }}
                style={[
                  styles.optionRow,
                  {
                    borderBottomWidth: index < options.length - 1 ? 1 : 0,
                    borderBottomColor: theme.colors.border,
                    backgroundColor:
                      option.value === value
                        ? theme.colors.primary + "15"
                        : "transparent",
                  },
                ]}
              >
                <AppText
                  variant="body"
                  style={{
                    fontWeight: option.value === value ? "600" : "400",
                    color:
                      option.value === value
                        ? theme.colors.primary
                        : theme.colors.textPrimary,
                  }}
                >
                  {option.label}
                </AppText>
                {option.value === value && (
                  <Ionicons
                    name="checkmark"
                    size={24}
                    color={theme.colors.primary}
                  />
                )}
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modal: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontWeight: "600",
  },
  optionsList: {
    padding: 16,
  },
  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
});
