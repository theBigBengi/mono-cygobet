// features/groups/invite/screens/GroupInviteScreen.tsx
// Screen for viewing and sharing group invite code.

import React from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Share, Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { Screen, AppText, Button } from "@/components/ui";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";
import {
  useInviteCodeQuery,
  useRegenerateInviteCodeMutation,
} from "@/domains/groups";
import { useTheme } from "@/lib/theme";

const DEEP_LINK_BASE = "mobile://groups/join";

interface GroupInviteScreenProps {
  groupId: number | null;
  isCreator?: boolean;
}

/**
 * GroupInviteScreen component
 *
 * Fetches and displays the group invite code. Share Invite uses Share.share()
 * with code + deep link. Regenerate Code triggers regeneration and refetches.
 */
export function GroupInviteScreen({
  groupId,
  isCreator,
}: GroupInviteScreenProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const router = useRouter();
  const { data, isLoading, error, refetch } = useInviteCodeQuery(groupId);
  const regenerateMutation = useRegenerateInviteCodeMutation(groupId);
  const [copied, setCopied] = React.useState(false);

  const inviteCode = data?.data?.inviteCode ?? "";
  const isRegenerating = regenerateMutation.isPending;

  const handleCopy = async () => {
    if (!inviteCode) return;
    await Clipboard.setStringAsync(inviteCode);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (!inviteCode) return;
    const message = `${t("invite.joinMessage")}\n\n${inviteCode}\n\n${DEEP_LINK_BASE}?code=${encodeURIComponent(inviteCode)}`;
    Share.share({
      message,
      title: t("invite.groupInvite"),
    }).catch(() => {});
  };

  const handleRegenerate = () => {
    regenerateMutation.mutate(undefined);
  };

  if (isLoading) {
    return (
      <Screen>
        <QueryLoadingView message={t("invite.loadingInviteCode")} />
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen>
        <QueryErrorView
          message={t("invite.failedLoadInviteCode")}
          onRetry={() => refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.container}>
        {/* Header section */}
        <View style={styles.headerSection}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: theme.colors.primary + "15" },
            ]}
          >
            <Ionicons name="link" size={32} color={theme.colors.primary} />
          </View>
          <AppText variant="title" style={styles.title}>
            {t("invite.inviteFriends")}
          </AppText>
          <AppText variant="body" color="secondary" style={styles.subtitle}>
            {t("invite.shareCodeDescription")}
          </AppText>
        </View>

        {/* Code card */}
        <Pressable onPress={handleCopy}>
          <View
            style={[
              styles.codeCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text
              style={[styles.codeLabel, { color: theme.colors.textSecondary }]}
            >
              {t("groups.inviteCode")}
            </Text>
            <Text style={[styles.code, { color: theme.colors.textPrimary }]}>
              {inviteCode}
            </Text>
            <View style={styles.copyRow}>
              <Ionicons
                name={copied ? "checkmark-circle" : "copy-outline"}
                size={16}
                color={
                  copied ? theme.colors.primary : theme.colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.copyText,
                  {
                    color: copied
                      ? theme.colors.primary
                      : theme.colors.textSecondary,
                  },
                ]}
              >
                {copied ? t("invite.copied") : t("invite.tapToCopy")}
              </Text>
            </View>
          </View>
        </Pressable>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            label={t("invite.shareInvite")}
            onPress={handleShare}
            icon="share-outline"
            style={styles.button}
          />
          {groupId != null && (
            <Button
              label={t("invite.inviteByUsername")}
              variant="secondary"
              onPress={() =>
                router.push(`/groups/${groupId}/invite-users` as any)
              }
              icon="person-add-outline"
              style={styles.button}
            />
          )}
          {isCreator && (
            <Button
              label={t("invite.regenerateCode")}
              variant="secondary"
              disabled={isRegenerating}
              onPress={handleRegenerate}
              icon="refresh-outline"
              style={styles.button}
            />
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    paddingHorizontal: 20,
  },
  codeCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
  },
  codeLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  code: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 6,
    marginBottom: 16,
  },
  copyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  copyText: {
    fontSize: 13,
    fontWeight: "500",
  },
  actions: {
    gap: 12,
  },
  button: {
    width: "100%",
  },
});
