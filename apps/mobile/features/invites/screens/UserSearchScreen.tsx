// features/invites/screens/UserSearchScreen.tsx
// Search users by username and send group invite.

import React, { useRef, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  FlatList,
  ListRenderItem,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useUsersSearchQuery, useSuggestedUsersQuery, useSendInviteMutation } from "@/domains/invites";
import { UserSearchInput } from "../components/UserSearchInput";
import { UserSearchResultItem } from "../components/UserSearchResultItem";
import { SendInviteSheet } from "../components/SendInviteSheet";
import { Screen, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import type { ApiUserSearchItem } from "@repo/types";

const MIN_QUERY_LENGTH = 3;
const SEARCH_DEBOUNCE_MS = 300;

interface UserSearchScreenProps {
  groupId: number;
  groupName?: string;
}

export function UserSearchScreen({ groupId, groupName }: UserSearchScreenProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
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

  const { data, isLoading, isFetching } = useUsersSearchQuery({
    q: debouncedQuery,
    excludeGroupId: groupId,
  });
  const { data: suggestedData, isLoading: suggestedLoading } = useSuggestedUsersQuery({
    excludeGroupId: groupId,
  });
  const sendInviteMutation = useSendInviteMutation(groupId);

  const sheetRef = useRef<BottomSheetModal>(null);
  const [selectedUser, setSelectedUser] = useState<ApiUserSearchItem | null>(
    null
  );

  const handleInvitePress = useCallback((user: ApiUserSearchItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedUser(user);
    sheetRef.current?.present();
  }, []);

  const handleSendInvite = (message?: string) => {
    if (!selectedUser) return;
    sendInviteMutation.mutate(
      { userId: selectedUser.id, message },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          sheetRef.current?.dismiss();
          setSelectedUser(null);
        },
        onError: (error) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert(
            t("errors.error"),
            error.message || t("errors.somethingWentWrong")
          );
        },
      }
    );
  };

  const searchUsers = data?.data ?? [];
  const suggestedUsers = suggestedData?.data ?? [];
  const isSearching = debouncedQuery.length >= MIN_QUERY_LENGTH;
  const showSearchLoading = isSearching && (isLoading || isFetching);
  const showSearchEmpty = isSearching && !isLoading && !isFetching && searchUsers.length === 0;
  const showSuggestions = !isSearching && suggestedUsers.length > 0;

  // Which users to display in the list
  const displayUsers = isSearching ? searchUsers : suggestedUsers;

  const renderItem: ListRenderItem<ApiUserSearchItem> = useCallback(
    ({ item }) => (
      <UserSearchResultItem
        user={item}
        onInvite={() => handleInvitePress(item)}
        isSending={sendInviteMutation.isPending}
      />
    ),
    [handleInvitePress, sendInviteMutation.isPending]
  );

  const renderHeader = () => (
    <View style={[styles.headerSection, { paddingTop: theme.spacing.sm, paddingBottom: theme.spacing.ml }]}>
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: theme.colors.primary + "15", borderRadius: theme.radius.full, marginBottom: theme.spacing.ms },
        ]}
      >
        <Ionicons name="person-add" size={28} color={theme.colors.primary} />
      </View>
      <AppText variant="title" style={styles.title}>
        {t("invites.inviteToGroupDefault")}
      </AppText>
      {groupName && (
        <AppText variant="body" color="secondary" style={[styles.groupName, { marginTop: theme.spacing.xs }]}>
          {groupName}
        </AppText>
      )}
    </View>
  );

  const renderSearchSection = () => (
    <View style={[styles.searchSection, { marginBottom: theme.spacing.md }]}>
      <UserSearchInput
        value={query}
        onChangeText={handleQueryChange}
        placeholder={t("invites.searchByUsername")}
        autoFocus
      />
      {query.length > 0 && query.length < MIN_QUERY_LENGTH && (
        <View style={[styles.hintRow, { gap: theme.spacing.xs, marginTop: theme.spacing.sm }]}>
          <Ionicons
            name="information-circle-outline"
            size={14}
            color={theme.colors.textSecondary}
          />
          <AppText variant="caption" color="secondary" style={styles.hintText}>
            {t("invites.minChars", { count: MIN_QUERY_LENGTH })}
          </AppText>
        </View>
      )}
    </View>
  );

  const renderLoading = () => (
    <View style={[styles.loadingContainer, { gap: theme.spacing.sm, paddingVertical: theme.spacing.ml }]}>
      <ActivityIndicator size="small" color={theme.colors.primary} />
      <AppText variant="body" color="secondary" style={styles.loadingText}>
        {t("invites.searchingUsers")}
      </AppText>
    </View>
  );

  const renderEmpty = () => (
    <View style={[styles.emptyContainer, { paddingTop: theme.spacing.xl, paddingBottom: theme.spacing.lg }]}>
      <View
        style={[
          styles.emptyIconCircle,
          { backgroundColor: theme.colors.surface, borderRadius: theme.radius.full, marginBottom: theme.spacing.md },
        ]}
      >
        <Ionicons
          name="search-outline"
          size={32}
          color={theme.colors.textSecondary}
          style={{ opacity: 0.5 }}
        />
      </View>
      <AppText variant="body" color="secondary" style={[styles.emptyText, { marginBottom: theme.spacing.xs }]}>
        {t("invites.noResults")}
      </AppText>
      <AppText variant="caption" color="secondary" style={[styles.emptyHint, { paddingHorizontal: theme.spacing.xl }]}>
        {t("invites.tryDifferentSearch")}
      </AppText>
    </View>
  );

  const renderSuggestionsHeader = () => (
    <View style={[styles.suggestionsHeader, { gap: theme.spacing.sm, marginBottom: theme.spacing.ms, paddingTop: theme.spacing.sm }]}>
      <Ionicons name="people" size={16} color={theme.colors.textSecondary} />
      <AppText variant="label" color="secondary" style={styles.suggestionsTitle}>
        {t("invites.suggestedUsers")}
      </AppText>
    </View>
  );

  const listHeader = (
    <>
      {renderHeader()}
      {renderSearchSection()}
      {showSearchLoading && renderLoading()}
      {showSearchEmpty && renderEmpty()}
      {showSuggestions && renderSuggestionsHeader()}
    </>
  );

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        {displayUsers.length > 0 ? (
          <FlatList
            data={displayUsers}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            removeClippedSubviews={Platform.OS === "android"}
            maxToRenderPerBatch={10}
            initialNumToRender={10}
            windowSize={5}
            ListHeaderComponent={listHeader}
            contentContainerStyle={[
              styles.listContent,
              { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {listHeader}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
      <SendInviteSheet
        sheetRef={sheetRef}
        username={selectedUser?.username ?? ""}
        onSend={handleSendInvite}
        isSending={sendInviteMutation.isPending}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  listContent: {},
  headerSection: {
    alignItems: "center",
  },
  iconCircle: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  groupName: {
    textAlign: "center",
  },
  searchSection: {},
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  hintText: {
    fontSize: 12,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: "center",
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 15,
  },
  emptyHint: {
    textAlign: "center",
  },
  suggestionsHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  suggestionsTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
