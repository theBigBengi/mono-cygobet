// features/groups/invite/screens/GroupInviteScreen.tsx
// Screen for viewing and sharing group invite code.

import React from "react";
import { View, StyleSheet, Share } from "react-native";
import { Screen, Card, AppText, Button } from "@/components/ui";
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
}

/**
 * GroupInviteScreen component
 *
 * Fetches and displays the group invite code. Share Invite uses Share.share()
 * with code + deep link. Regenerate Code triggers regeneration and refetches.
 */
export function GroupInviteScreen({ groupId }: GroupInviteScreenProps) {
  const { theme } = useTheme();
  const { data, isLoading, error, refetch } = useInviteCodeQuery(groupId);
  const regenerateMutation = useRegenerateInviteCodeMutation(groupId);

  const inviteCode = data?.data?.inviteCode ?? "";
  const isRegenerating = regenerateMutation.isPending;

  const handleShare = () => {
    if (!inviteCode) return;
    const message = `${inviteCode}\n${DEEP_LINK_BASE}?code=${encodeURIComponent(inviteCode)}`;
    Share.share({
      message,
      title: "Group invite",
    }).catch(() => {});
  };

  const handleRegenerate = () => {
    regenerateMutation.mutate(undefined);
  };

  if (isLoading) {
    return (
      <Screen>
        <QueryLoadingView message="Loading invite code..." />
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen>
        <QueryErrorView
          message="Failed to load invite code"
          onRetry={() => refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={[styles.container, { padding: theme.spacing.md }]}>
        <Card style={styles.card}>
          <AppText
            variant="caption"
            color="secondary"
            style={[styles.label, { marginBottom: theme.spacing.sm }]}
          >
            Invite code
          </AppText>
          <AppText
            variant="title"
            style={[
              styles.code,
              {
                color: theme.colors.textPrimary,
                letterSpacing: 4,
              },
            ]}
          >
            {inviteCode}
          </AppText>
        </Card>

        <Button
          label="Share Invite"
          onPress={handleShare}
          style={[styles.button, { marginTop: theme.spacing.md }]}
        />
        <Button
          label="Regenerate Code"
          variant="secondary"
          disabled={isRegenerating}
          onPress={handleRegenerate}
          style={[styles.button, { marginTop: theme.spacing.sm }]}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  label: {
    textTransform: "uppercase",
  },
  code: {
    fontSize: 28,
    fontWeight: "700",
  },
  button: {
    width: "100%",
  },
});
