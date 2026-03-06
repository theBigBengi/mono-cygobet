// features/invites/components/SentInvitesList.tsx
// List of sent invites with cancel functionality.

import React, { useEffect } from "react";
import { View, StyleSheet, Text } from "react-native";
import { useTranslation } from "react-i18next";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/lib/theme";
import { useSentInvitesQuery, useCancelInviteMutation } from "@/domains/invites";
import { SentInviteItem } from "./SentInviteItem";

interface SentInvitesListProps {
  groupId: number;
}

export function SentInvitesList({ groupId }: SentInvitesListProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const { data, isLoading } = useSentInvitesQuery(groupId);
  const cancelMutation = useCancelInviteMutation(groupId);

  const skeletonOpacity = useSharedValue(0.3);
  useEffect(() => {
    if (isLoading) {
      skeletonOpacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
    }
  }, [isLoading, skeletonOpacity]);
  const skeletonStyle = useAnimatedStyle(() => ({ opacity: skeletonOpacity.value }));

  const invites = data?.data ?? [];

  const handleCancel = (inviteId: number) => {
    cancelMutation.mutate(inviteId, {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
      onError: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      },
    });
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Animated.View
          style={[{ width: 100, height: 12, borderRadius: 6, backgroundColor: theme.colors.border }, skeletonStyle]}
        />
        {[0, 1].map((i) => (
          <View key={i} style={styles.skeletonRow}>
            <Animated.View
              style={[{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.border }, skeletonStyle]}
            />
            <View style={{ flex: 1, gap: 4 }}>
              <Animated.View
                style={[{ width: 80, height: 12, borderRadius: 4, backgroundColor: theme.colors.border }, skeletonStyle]}
              />
              <Animated.View
                style={[{ width: 60, height: 10, borderRadius: 4, backgroundColor: theme.colors.border }, skeletonStyle]}
              />
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (invites.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.headerTitle, { color: theme.colors.textSecondary }]}>
        {t("invites.sentInvites")} ({invites.length})
      </Text>
      {invites.map((item) => (
        <SentInviteItem
          key={String(item.id)}
          invite={item}
          onCancel={handleCancel}
          isCancelling={cancelMutation.isPending}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  skeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
});
