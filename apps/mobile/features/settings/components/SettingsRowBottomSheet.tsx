// features/settings/components/SettingsRowBottomSheet.tsx
// Reusable row + bottom sheet: same look as SettingsRowPicker but opens @gorhom/bottom-sheet.
// Use .Row inside ScrollView and .Sheet outside (same ref) so present() works.

import React, { useMemo } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";

export interface PickerOption<T> {
  value: T;
  label: string;
}

const snapPoints = ["40%", "60%"] as const;

// —— Row (use inside ScrollView) ——
interface RowProps {
  sheetRef: React.RefObject<React.ComponentRef<typeof BottomSheetModal> | null>;
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  valueDisplay: string;
  isLast?: boolean;
  disabled?: boolean;
}

function RowComponent({
  sheetRef,
  icon,
  label,
  valueDisplay,
  isLast = false,
  disabled = false,
}: RowProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={() => !disabled && sheetRef.current?.present()}
      disabled={disabled}
      style={({ pressed }) => [
        styles.row,
        {
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.md,
          borderBottomWidth: isLast ? 0 : 1,
          borderBottomColor: theme.colors.border,
          backgroundColor: disabled
            ? "transparent"
            : pressed
              ? theme.colors.border
              : "transparent",
          opacity: disabled ? 0.6 : 1,
        },
      ]}
    >
      {icon != null && (
        <View
          style={[
            styles.iconContainer,
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
      <View style={styles.labelContainer}>
        <AppText variant="body" style={styles.label}>
          {label}
        </AppText>
      </View>
      <AppText variant="body" color="secondary">
        {valueDisplay}
      </AppText>
      <Ionicons
        name="chevron-forward"
        size={20}
        color={theme.colors.textSecondary}
        style={{ marginStart: 4 }}
      />
    </Pressable>
  );
}

// —— Sheet (render outside ScrollView, pass same ref as Row) ——
interface SheetOptionsProps<T extends string> {
  sheetRef: React.RefObject<React.ComponentRef<typeof BottomSheetModal> | null>;
  title: string;
  options: PickerOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  children?: never;
}

interface SheetChildrenProps {
  sheetRef: React.RefObject<React.ComponentRef<typeof BottomSheetModal> | null>;
  title: string;
  options?: never;
  value?: never;
  onValueChange?: never;
  children: React.ReactNode;
}

type SheetProps<T extends string> = SheetOptionsProps<T> | SheetChildrenProps;

function SheetComponent<T extends string>(props: SheetProps<T>) {
  const { theme } = useTheme();
  const { sheetRef, title } = props;

  const backgroundStyle = useMemo(
    () => ({ backgroundColor: theme.colors.background }),
    [theme.colors.background]
  );

  const handleIndicatorStyle = useMemo(
    () => ({ backgroundColor: theme.colors.textSecondary }),
    [theme.colors.textSecondary]
  );

  if ("options" in props && props.options != null) {
    const { options, value, onValueChange } = props;
    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        enablePanDownToClose
        backgroundStyle={backgroundStyle}
        handleIndicatorStyle={handleIndicatorStyle}
      >
        <BottomSheetView style={styles.sheetWrap}>
          <View
            style={[styles.header, { borderBottomColor: theme.colors.border }]}
          >
            <AppText variant="subtitle" style={styles.headerTitle}>
              {title}
            </AppText>
            <Pressable
              onPress={() => sheetRef.current?.dismiss()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="close"
                size={28}
                color={theme.colors.textSecondary}
              />
            </Pressable>
          </View>
          <View style={styles.optionsList}>
            {options.map((option, index) => (
              <Pressable
                key={option.value}
                onPress={() => {
                  onValueChange(option.value);
                  sheetRef.current?.dismiss();
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
        </BottomSheetView>
      </BottomSheetModal>
    );
  }

  const { children } = props;
  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      backgroundStyle={backgroundStyle}
      handleIndicatorStyle={handleIndicatorStyle}
    >
      <BottomSheetView style={styles.sheetWrap}>
        <View
          style={[styles.header, { borderBottomColor: theme.colors.border }]}
        >
          <AppText variant="subtitle" style={styles.headerTitle}>
            {title}
          </AppText>
          <Pressable
            onPress={() => sheetRef.current?.dismiss()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="close"
              size={28}
              color={theme.colors.textSecondary}
            />
          </Pressable>
        </View>
        <View style={styles.sheetContent}>{children}</View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

// Compound export
export const SettingsRowBottomSheet = {
  Row: RowComponent,
  Sheet: SheetComponent,
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    fontWeight: "500",
  },
  sheetWrap: {
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
  sheetContent: {
    padding: 16,
    paddingBottom: 32,
  },
});
