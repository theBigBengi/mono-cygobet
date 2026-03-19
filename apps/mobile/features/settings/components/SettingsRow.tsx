// features/settings/components/SettingsRow.tsx
// Modern settings row — clean, spacious, iOS-inspired.

import React from "react";
import { View, Pressable, Switch, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";

type SettingsRowType = "navigation" | "toggle" | "value";

interface SettingsRowBaseProps {
  /** Ionicons name (used when iconComponent is not set) */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Custom icon element (e.g. MaterialIcons); when set, takes precedence over icon */
  iconComponent?: React.ReactNode;
  label: string;
  subtitle?: string;
  isLast?: boolean;
  /** When true, uses danger color for icon and label */
  danger?: boolean;
}

interface SettingsRowNavigationProps extends SettingsRowBaseProps {
  type: "navigation";
  onPress: () => void;
}

interface SettingsRowToggleProps extends SettingsRowBaseProps {
  type: "toggle";
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

interface SettingsRowValueProps extends SettingsRowBaseProps {
  type: "value";
  value: string;
  onPress?: () => void;
}

type SettingsRowProps =
  | SettingsRowNavigationProps
  | SettingsRowToggleProps
  | SettingsRowValueProps;

export function SettingsRow(props: SettingsRowProps) {
  const { theme } = useTheme();
  const { icon, iconComponent, label, subtitle, isLast = false, type, danger = false } = props;

  const showIcon = icon != null || iconComponent != null;
  const iconBgColor = danger ? theme.colors.danger : theme.colors.primary;
  const labelColor = danger ? theme.colors.danger : theme.colors.textPrimary;

  const content = (
    <View
      style={[
        styles.row,
        {
          paddingVertical: theme.spacing.ms,
          paddingHorizontal: theme.spacing.md,
          borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      {showIcon && (
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: iconBgColor,
              borderRadius: theme.radius.s,
              marginEnd: theme.spacing.ms,
            },
          ]}
        >
          {iconComponent ??
            (icon != null ? (
              <Ionicons
                name={icon}
                size={16}
                color={theme.colors.primaryText}
              />
            ) : null)}
        </View>
      )}

      <View style={styles.labelContainer}>
        <AppText variant="body" style={[styles.label, { color: labelColor }]}>
          {label}
        </AppText>
        {subtitle && (
          <AppText variant="caption" color="secondary" style={styles.subtitle}>
            {subtitle}
          </AppText>
        )}
      </View>

      {type === "navigation" && (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={danger ? theme.colors.danger + "80" : theme.colors.textDisabled}
        />
      )}

      {type === "toggle" && (
        <Switch
          value={props.value}
          onValueChange={props.onValueChange}
          disabled={props.disabled}
          trackColor={{
            false: theme.colors.border,
            true: theme.colors.primary,
          }}
          thumbColor={
            props.value ? theme.colors.primaryText : theme.colors.surface
          }
        />
      )}

      {type === "value" && (
        <View style={styles.valueContainer}>
          <AppText variant="body" color="secondary" numberOfLines={1}>
            {props.value}
          </AppText>
          {props.onPress && (
            <Ionicons
              name="chevron-forward"
              size={18}
              color={theme.colors.textDisabled}
              style={{ marginStart: theme.spacing.xs }}
            />
          )}
        </View>
      )}
    </View>
  );

  const handlePress = () => {
    if (props.type === "navigation") {
      props.onPress();
    } else if (props.type === "value" && props.onPress) {
      props.onPress();
    }
  };

  if (type === "navigation" || (type === "value" && props.onPress)) {
    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          { backgroundColor: pressed ? theme.colors.border + "40" : "transparent" },
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
  },
  iconContainer: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    fontWeight: "500",
  },
  subtitle: {
    marginTop: 1,
  },
  valueContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },
});
