// features/settings/components/SettingsRowBottomSheet.tsx
// Reusable row + bottom sheet: same look as SettingsRowPicker but opens @gorhom/bottom-sheet.
// Use .Row inside ScrollView and .Sheet outside (same ref) so present() works.

import React, { useCallback, useMemo } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
} from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { settingsSharedStyles } from "./settingsStyles";

export interface PickerOption<T> {
  value: T;
  label: string;
}

// —— Row (use inside ScrollView) ——
interface RowProps {
  sheetRef: React.RefObject<React.ComponentRef<typeof BottomSheetModal> | null>;
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  valueDisplay: string;
  subtitle?: string;
  isLast?: boolean;
  disabled?: boolean;
}

function RowComponent({
  sheetRef,
  icon,
  label,
  valueDisplay,
  subtitle,
  isLast = false,
  disabled = false,
}: RowProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={() => !disabled && sheetRef.current?.present()}
      disabled={disabled}
      style={({ pressed }) => [
        settingsSharedStyles.row,
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
        {subtitle != null && subtitle !== "" && (
          <AppText variant="caption" color="secondary">
            {subtitle}
          </AppText>
        )}
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

// —— Shared sheet wrapper: [close] [centered title] [spacer] + body ——
interface SheetWrapperProps {
  sheetRef: React.RefObject<React.ComponentRef<typeof BottomSheetModal> | null>;
  title: string;
  children: React.ReactNode;
}

function SheetWrapper({ sheetRef, title, children }: SheetWrapperProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const backgroundStyle = useMemo(
    () => ({ backgroundColor: theme.colors.background }),
    [theme.colors.background]
  );

  const handleIndicatorStyle = useMemo(
    () => ({ backgroundColor: theme.colors.textSecondary }),
    [theme.colors.textSecondary]
  );

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
      />
    ),
    []
  );

  const contentPaddingBottom = useMemo(
    () => Math.max(32, insets.bottom),
    [insets.bottom]
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={backgroundStyle}
      handleIndicatorStyle={handleIndicatorStyle}
    >
      <BottomSheetView style={styles.sheetWrap}>
        <View
          style={[styles.header, { borderBottomColor: theme.colors.border }]}
        >
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
          <AppText variant="subtitle" style={styles.headerTitle}>
            {title}
          </AppText>
          <View style={styles.headerSpacer} />
        </View>
        <View
          style={[styles.sheetContent, { paddingBottom: contentPaddingBottom }]}
        >
          {children}
        </View>
      </BottomSheetView>
    </BottomSheetModal>
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

  if ("options" in props && props.options != null) {
    const { options, value, onValueChange } = props;
    return (
      <SheetWrapper sheetRef={sheetRef} title={title}>
        <View
          style={[
            styles.optionsCard,
            {
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radius.md,
              borderColor: theme.colors.border,
            },
          ]}
        >
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
      </SheetWrapper>
    );
  }

  const { children } = props;
  return (
    <SheetWrapper sheetRef={sheetRef} title={title}>
      {children}
    </SheetWrapper>
  );
}

// Compound export
export const SettingsRowBottomSheet = {
  Row: RowComponent,
  Sheet: SheetComponent,
};

const styles = StyleSheet.create({
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
    flex: 1,
    textAlign: "center",
  },
  headerSpacer: {
    width: 28,
  },
  sheetContent: {
    padding: 16,
  },
  optionsCard: {
    borderWidth: 1,
    overflow: "hidden",
  },
  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
});
