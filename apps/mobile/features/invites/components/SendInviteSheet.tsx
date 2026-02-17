// features/invites/components/SendInviteSheet.tsx
// Bottom sheet: optional message + Send Invite button.

import React from "react";
import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { BottomSheetModal, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { useTheme } from "@/lib/theme";
import { AppText, Button } from "@/components/ui";

interface SendInviteSheetProps {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  username: string;
  onSend: (message?: string) => void;
  isSending?: boolean;
}

export function SendInviteSheet({
  sheetRef,
  username,
  onSend,
  isSending,
}: SendInviteSheetProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const [message, setMessage] = React.useState("");

  const handleSend = () => {
    onSend(message.trim() || undefined);
    setMessage("");
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={["40%"]}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: theme.colors.background }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.border }}
    >
      <View style={[styles.content, { paddingHorizontal: theme.spacing.lg }]}>
        <AppText variant="title" style={styles.title}>
          {t("invites.inviteToGroupDefault")} @{username}
        </AppText>
        <AppText variant="caption" color="secondary" style={styles.subtitle}>
          {t("invites.optionalMessage")}
        </AppText>
        <BottomSheetTextInput
          value={message}
          onChangeText={setMessage}
          placeholder={t("invites.messagePlaceholder")}
          placeholderTextColor={theme.colors.textSecondary}
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.textPrimary,
            },
          ]}
          maxLength={200}
          multiline
        />
        <Button
          label={t("invites.sendInvite")}
          onPress={handleSend}
          disabled={isSending}
          style={styles.button}
        />
      </View>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingTop: 8,
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  button: {
    width: "100%",
  },
});
