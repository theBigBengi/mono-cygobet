import React from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, TextInput } from "react-native";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";

interface GroupLobbyNameHeaderProps {
  /**
   * Current group name value
   */
  name: string;
  /**
   * Callback when name changes
   */
  onChange: (name: string) => void;
  /**
   * Whether the input is editable
   */
  editable: boolean;
  /**
   * Whether the current user is the creator
   */
  isCreator: boolean;
}

/**
 * Component for displaying/editing the group name.
 * Shows TextInput when creator and editable, AppText otherwise.
 */
export function GroupLobbyNameHeader({
  name,
  onChange,
  editable,
  isCreator,
}: GroupLobbyNameHeaderProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  // Show TextInput only if creator and editable (draft mode)
  // Otherwise show as read-only text
  const showInput = isCreator && editable;

  return (
    <View style={styles.container}>
      {showInput ? (
        <TextInput
          style={[
            styles.nameInput,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.textPrimary,
            },
          ]}
          value={name}
          onChangeText={onChange}
          placeholder={t("lobby.groupNamePlaceholder")}
          placeholderTextColor={theme.colors.textSecondary}
          editable={editable}
        />
      ) : (
        <AppText variant="body" style={styles.groupName}>
          {name}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  groupName: {
    fontSize: 18,
    fontWeight: "600",
  },
  nameInput: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 18,
    fontWeight: "600",
  },
});
