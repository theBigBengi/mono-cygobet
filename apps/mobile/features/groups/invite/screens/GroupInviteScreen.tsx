// features/groups/invite/screens/GroupInviteScreen.tsx
// Layout: Search + Users (scroll) | Share link (fixed bottom)

import React, { useRef, useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Pressable,
  Text,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { AppText } from "@/components/ui";
import { useInviteCodeQuery } from "@/domains/groups";
import {
  useUsersSearchQuery,
  useSuggestedUsersQuery,
  useSendInviteMutation,
  useSentInvitesQuery,
  useCancelInviteMutation,
} from "@/domains/invites";
import { useTheme } from "@/lib/theme";
import { UserSearchInput } from "@/features/invites/components/UserSearchInput";
import { UserSearchResultItem } from "@/features/invites/components/UserSearchResultItem";
import type { ApiUserSearchItem } from "@repo/types";

const MIN_QUERY_LENGTH = 3;
const SEARCH_DEBOUNCE_MS = 300;

interface GroupInviteScreenProps {
  groupId: number | null;
  groupName?: string;
}

export function GroupInviteScreen({
  groupId,
  groupName,
}: GroupInviteScreenProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  const skeletonOpacity = useSharedValue(0.3);
  useEffect(() => {
    skeletonOpacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [skeletonOpacity]);
  const skeletonStyle = useAnimatedStyle(() => ({ opacity: skeletonOpacity.value }));

  // ── Invite link ─────────────────────────────────────────────
  const { data, isLoading, error, refetch } = useInviteCodeQuery(groupId);
  // ── User search ──────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(text.trim());
      debounceRef.current = null;
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  const {
    data: searchData,
    isLoading: searchLoading,
    isFetching: searchFetching,
  } = useUsersSearchQuery({
    q: debouncedQuery,
    excludeGroupId: groupId ?? undefined,
  });
  const { data: suggestedData, isLoading: suggestedLoading } =
    useSuggestedUsersQuery({ excludeGroupId: groupId ?? undefined });
  const sendInviteMutation = useSendInviteMutation(groupId ?? 0);
  const cancelInviteMutation = useCancelInviteMutation(groupId ?? 0);
  const { data: sentInvitesData } = useSentInvitesQuery(groupId ?? 0);
  const [sessionInvitedIds, setSessionInvitedIds] = useState<Set<number>>(
    () => new Set(),
  );

  // Merge: IDs from server (already sent) + IDs from this session
  const invitedUserIds = useMemo(() => {
    const ids = new Set(sessionInvitedIds);
    sentInvitesData?.data?.forEach((inv) => ids.add(inv.inviteeId));
    return ids;
  }, [sessionInvitedIds, sentInvitesData]);

  // Map userId -> inviteId for cancellation
  const userInviteIdMap = useMemo(() => {
    const map = new Map<number, number>();
    sentInvitesData?.data?.forEach((inv) => map.set(inv.inviteeId, inv.id));
    return map;
  }, [sentInvitesData]);

  const handleInvitePress = useCallback(
    (user: ApiUserSearchItem) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      sendInviteMutation.mutate(
        { userId: user.id },
        {
          onSuccess: () => {
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success,
            );
            setSessionInvitedIds((prev) => new Set(prev).add(user.id));
          },
          onError: (err) => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(
              t("errors.error"),
              err.message || t("errors.somethingWentWrong"),
            );
          },
        },
      );
    },
    [sendInviteMutation, t],
  );

  const handleCancelInvite = useCallback(
    (user: ApiUserSearchItem) => {
      const inviteId = userInviteIdMap.get(user.id);
      if (!inviteId) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      cancelInviteMutation.mutate(inviteId, {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setSessionInvitedIds((prev) => {
            const next = new Set(prev);
            next.delete(user.id);
            return next;
          });
        },
        onError: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        },
      });
    },
    [cancelInviteMutation, userInviteIdMap],
  );

  // ── Derived state ────────────────────────────────────────────
  const searchResults = searchData?.data ?? [];

  const suggestedUsers = suggestedData?.data ?? [];

  const isSearching = debouncedQuery.length >= MIN_QUERY_LENGTH;
  const isSearchBusy = isSearching && (searchLoading || searchFetching);
  const isSearchEmpty =
    isSearching && !searchLoading && !searchFetching && searchResults.length === 0;

  // ── Full-screen loading / error ──────────────────────────────
  if (isLoading) {
    return (
      <View style={[styles.container, { paddingHorizontal: 16, paddingTop: 12 }]}>
        {/* Search skeleton */}
        <Animated.View style={[{ height: 40, borderRadius: 10, backgroundColor: theme.colors.border }, skeletonStyle]} />
        {/* User rows skeleton */}
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 }}>
            <Animated.View style={[{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.border }, skeletonStyle]} />
            <View style={{ flex: 1, gap: 4 }}>
              <Animated.View style={[{ width: 100, height: 12, borderRadius: 4, backgroundColor: theme.colors.border }, skeletonStyle]} />
              <Animated.View style={[{ width: 70, height: 10, borderRadius: 4, backgroundColor: theme.colors.border }, skeletonStyle]} />
            </View>
            <Animated.View style={[{ width: 60, height: 28, borderRadius: 14, backgroundColor: theme.colors.border }, skeletonStyle]} />
          </View>
        ))}
      </View>
    );
  }
  if (error || !data) {
    return (
      <View style={[styles.container, styles.statusCenter]}>
        <Ionicons name="alert-circle-outline" size={24} color={theme.colors.textSecondary} />
        <AppText variant="body" color="secondary">
          {t("invite.failedLoadInviteCode")}
        </AppText>
        <Pressable onPress={() => refetch()} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
          <AppText variant="body" color="primary">{t("common.retry")}</AppText>
        </Pressable>
      </View>
    );
  }

  // ── Users section content ────────────────────────────────────
  const renderUsersContent = () => {
    if (isSearching) {
      if (isSearchBusy) {
        return (
          <View>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 }}>
                <Animated.View style={[{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.border }, skeletonStyle]} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Animated.View style={[{ width: 90, height: 12, borderRadius: 4, backgroundColor: theme.colors.border }, skeletonStyle]} />
                  <Animated.View style={[{ width: 60, height: 10, borderRadius: 4, backgroundColor: theme.colors.border }, skeletonStyle]} />
                </View>
              </View>
            ))}
          </View>
        );
      }
      if (isSearchEmpty) {
        return (
          <View style={styles.statusCenter}>
            <Ionicons
              name="search-outline"
              size={24}
              color={theme.colors.textSecondary}
              style={{ opacity: 0.5 }}
            />
            <AppText variant="body" color="secondary">
              {t("invites.noResults")}
            </AppText>
            <AppText variant="caption" color="secondary">
              {t("invites.tryDifferentSearch")}
            </AppText>
          </View>
        );
      }
      return renderUsersList(searchResults);
    }

    if (suggestedLoading) {
      return (
        <View>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 }}>
              <Animated.View style={[{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.border }, skeletonStyle]} />
              <View style={{ flex: 1, gap: 4 }}>
                <Animated.View style={[{ width: 90, height: 12, borderRadius: 4, backgroundColor: theme.colors.border }, skeletonStyle]} />
                <Animated.View style={[{ width: 60, height: 10, borderRadius: 4, backgroundColor: theme.colors.border }, skeletonStyle]} />
              </View>
            </View>
          ))}
        </View>
      );
    }
    if (suggestedUsers.length === 0) {
      return (
        <View style={styles.statusCenter}>
          <Ionicons
            name="people-outline"
            size={28}
            color={theme.colors.textSecondary}
            style={{ opacity: 0.4 }}
          />
          <AppText variant="body" color="secondary">
            {t("invite.searchDescription")}
          </AppText>
        </View>
      );
    }
    return (
      <>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
          {t("invites.suggestions")}
        </Text>
        {renderUsersList(suggestedUsers)}
      </>
    );
  };

  const renderUsersList = (users: ApiUserSearchItem[]) => {
    const uninvited = users.filter((u) => !invitedUserIds.has(u.id));
    const invited = users.filter((u) => invitedUserIds.has(u.id));

    return (
      <>
        {uninvited.map((user) => (
          <UserSearchResultItem
            key={String(user.id)}
            user={user}
            onInvite={() => handleInvitePress(user)}
            onCancelInvite={() => handleCancelInvite(user)}
            isSending={sendInviteMutation.isPending}
            isCancelling={cancelInviteMutation.isPending}
            invited={false}
          />
        ))}
        {invited.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
              {t("invites.pendingInvites")}
            </Text>
            {invited.map((user) => (
              <UserSearchResultItem
                key={String(user.id)}
                user={user}
                onInvite={() => handleInvitePress(user)}
                onCancelInvite={() => handleCancelInvite(user)}
                isSending={sendInviteMutation.isPending}
                isCancelling={cancelInviteMutation.isPending}
                invited
              />
            ))}
          </>
        )}
      </>
    );
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        {/* ─── Scrollable area ─────────────────────────── */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <UserSearchInput
            value={query}
            onChangeText={handleQueryChange}
            placeholder={t("invites.searchByUsername")}
          />

          {query.length > 0 && query.length < MIN_QUERY_LENGTH && (
            <View style={styles.hintRow}>
              <Ionicons
                name="information-circle-outline"
                size={14}
                color={theme.colors.textSecondary}
              />
              <AppText variant="caption" color="secondary">
                {t("invites.minChars", { count: MIN_QUERY_LENGTH })}
              </AppText>
            </View>
          )}

          {renderUsersContent()}
        </ScrollView>

      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  statusCenter: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 8,
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: -8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 4,
  },
});
