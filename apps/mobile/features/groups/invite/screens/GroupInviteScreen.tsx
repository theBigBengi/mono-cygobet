// features/groups/invite/screens/GroupInviteScreen.tsx
// Layout: Search + Users (scroll) | Share link (fixed bottom)

import React, { useRef, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Share,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Screen, AppText, Button } from "@/components/ui";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";
import { useInviteCodeQuery } from "@/domains/groups";
import {
  useUsersSearchQuery,
  useSuggestedUsersQuery,
  useSendInviteMutation,
} from "@/domains/invites";
import { useTheme } from "@/lib/theme";
import { UserSearchInput } from "@/features/invites/components/UserSearchInput";
import { UserSearchResultItem } from "@/features/invites/components/UserSearchResultItem";
import { SentInvitesList } from "@/features/invites/components/SentInvitesList";
import type { ApiUserSearchItem } from "@repo/types";

const DEEP_LINK_BASE = "https://mono-cygobet.onrender.com/groups/join";
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
  const insets = useSafeAreaInsets();

  // ── Invite link ─────────────────────────────────────────────
  const { data, isLoading, error, refetch } = useInviteCodeQuery(groupId);
  const inviteCode = data?.data?.inviteCode ?? "";

  const handleShareLink = () => {
    if (!inviteCode) return;
    const link = `${DEEP_LINK_BASE}?code=${encodeURIComponent(inviteCode)}`;
    const message = `${t("invite.joinMessage")}\n${link}`;
    Share.share({ message, title: t("invite.groupInvite") }).catch(() => {});
  };

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
  const [invitedUserIds, setInvitedUserIds] = useState<Set<number>>(
    () => new Set(),
  );

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
            setInvitedUserIds((prev) => new Set(prev).add(user.id));
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

  // ── Users section content ────────────────────────────────────
  const renderUsersContent = () => {
    if (isSearching) {
      if (isSearchBusy) {
        return (
          <View style={styles.statusCenter}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <AppText variant="caption" color="secondary">
              {t("invites.searchingUsers")}
            </AppText>
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
      return searchResults.map((user) => (
        <UserSearchResultItem
          key={String(user.id)}
          user={user}
          onInvite={() => handleInvitePress(user)}
          isSending={sendInviteMutation.isPending}
          invited={invitedUserIds.has(user.id)}
        />
      ));
    }

    if (suggestedLoading) {
      return (
        <View style={styles.statusCenter}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
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
    return suggestedUsers.map((user) => (
      <UserSearchResultItem
        key={String(user.id)}
        user={user}
        onInvite={() => handleInvitePress(user)}
        isSending={sendInviteMutation.isPending}
        invited={invitedUserIds.has(user.id)}
      />
    ));
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

          {/* ─── Sent invites ──────────────────────────── */}
          {groupId != null && <SentInvitesList groupId={groupId} />}
        </ScrollView>

        {/* ─── Fixed bottom: Share link ────────────────── */}
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: theme.colors.background,
              borderTopColor: theme.colors.border,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <Button
            label={t("invite.shareInvite")}
            variant="primary"
            onPress={handleShareLink}
          />
        </View>
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
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
