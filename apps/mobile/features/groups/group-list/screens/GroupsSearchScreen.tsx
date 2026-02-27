// features/groups/group-list/screens/GroupsSearchScreen.tsx
// Browse public groups screen.
// - Header: back arrow + title (left), key icon (right) opens join-with-code sheet
// - Public groups list shown immediately
// - Bottom sheet for entering invite code
// - Tap group card to preview details in bottom sheet

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  Text,
  ActivityIndicator,
  FlatList,
  Alert,
  RefreshControl,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { useQueryClient } from "@tanstack/react-query";
import { AppText, Button, GroupAvatar } from "@/components/ui";
import { InfoSheet } from "@/components/ui/InfoSheet";
import { useTheme } from "@/lib/theme";
import { useDebounce } from "@/hooks/useDebounce";
import {
  usePublicGroupsQuery,
  useJoinPublicGroupMutation,
  useJoinGroupByCodeMutation,
} from "@/domains/groups";
import { groupsKeys } from "@/domains/groups/groups.keys";
import type { ApiPublicGroupItem } from "@repo/types";

const PER_PAGE = 20;
const AVATAR_SIZE = 56;

function getInitials(name: string): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function GroupsSearchScreen() {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const joinSheetRef = useRef<React.ComponentRef<typeof BottomSheetModal>>(null);
  const previewSheetRef = useRef<React.ComponentRef<typeof BottomSheetModal>>(null);

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 400);
  const trimmedSearch = debouncedSearch.trim();
  const searchParam = trimmedSearch.length >= 3 ? trimmedSearch : undefined;

  const [page, setPage] = useState(1);
  const [accumulated, setAccumulated] = useState<ApiPublicGroupItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const isFirstRender = useRef(true);

  const { data, isLoading, isFetching } = usePublicGroupsQuery({
    page,
    perPage: PER_PAGE,
    search: searchParam,
  });

  const isSearching = !!searchParam && isFetching;

  // Join with code state
  const [inviteCode, setInviteCode] = useState("");
  const joinByCodeMutation = useJoinGroupByCodeMutation();

  // Preview sheet state
  const [selectedGroup, setSelectedGroup] = useState<ApiPublicGroupItem | null>(null);

  // Accumulate items when response changes
  useEffect(() => {
    if (!data?.data) return;
    if (data.pagination.page === 1) {
      setAccumulated(data.data);
    } else {
      setAccumulated((prev) => [...prev, ...data.data]);
    }
  }, [data]);

  // Stop refresh spinner when fetch completes
  useEffect(() => {
    if (refreshing && !isFetching) {
      setRefreshing(false);
    }
  }, [refreshing, isFetching]);

  // Reset when search changes (skip initial mount to avoid clearing cached data)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setPage(1);
    setAccumulated([]);
  }, [searchParam]);

  const loadMore = useCallback(() => {
    if (!data?.pagination) return;
    const { page: currentPage, totalPages } = data.pagination;
    if (currentPage < totalPages) {
      setPage((p) => p + 1);
    }
  }, [data?.pagination]);

  const hasMore =
    data?.pagination != null &&
    data.pagination.page < data.pagination.totalPages;

  const handleJoinWithCode = useCallback(() => {
    const trimmed = inviteCode.trim();
    if (!trimmed) return;
    joinByCodeMutation.mutate(trimmed, {
      onSuccess: (response) => {
        joinSheetRef.current?.dismiss();
        setInviteCode("");
        router.replace(`/groups/${response.data.id}`);
      },
      onError: (error) => {
        Alert.alert(
          t("errors.error"),
          error?.message || t("groups.failedJoinGroup"),
        );
      },
    });
  }, [inviteCode, joinByCodeMutation, router, t]);

  const handlePreview = useCallback((group: ApiPublicGroupItem) => {
    setSelectedGroup(group);
    previewSheetRef.current?.present();
  }, []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
      />
    ),
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: ApiPublicGroupItem }) => (
      <PublicGroupRow
        group={item}
        onJoinSuccess={() => router.replace(`/groups/${item.id}`)}
        onPreview={() => handlePreview(item)}
      />
    ),
    [router, handlePreview],
  );

  const keyExtractor = useCallback(
    (item: ApiPublicGroupItem) => String(item.id),
    [],
  );

  return (
    <>
      <View
        style={[styles.root, { backgroundColor: theme.colors.background }]}
      >
        {/* Header: back + title + key icon */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <View style={styles.headerLeft}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={({ pressed }) => [
                styles.backButton,
                pressed && { opacity: 0.5 },
              ]}
            >
              <Ionicons
                name="chevron-back"
                size={28}
                color={theme.colors.textPrimary}
              />
            </Pressable>
            <AppText variant="subtitle" style={styles.headerTitle} numberOfLines={1}>
              {t("groups.discover")}
            </AppText>
          </View>
          <Pressable
            onPress={() => joinSheetRef.current?.present()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={({ pressed }) => [
              styles.headerKeyButton,
              pressed && { opacity: 0.5 },
            ]}
          >
            <Ionicons
              name="key-outline"
              size={22}
              color={theme.colors.textSecondary}
            />
          </Pressable>
        </View>

        {/* Search field */}
        <View style={[styles.searchRow, { paddingHorizontal: theme.spacing.md }]}>
          <View
            style={[
              styles.searchInputContainer,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
            <TextInput
              value={searchInput}
              onChangeText={setSearchInput}
              placeholder={t("discover.searchPlaceholder")}
              placeholderTextColor={theme.colors.textSecondary}
              returnKeyType="search"
              autoCorrect={false}
              style={[styles.searchInput, { color: theme.colors.textPrimary }]}
            />
            {isSearching && (
              <ActivityIndicator size="small" color={theme.colors.textSecondary} />
            )}
            {searchInput.length > 0 && !isSearching && (
              <Pressable
                onPress={() => setSearchInput("")}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Public groups list */}
        {isLoading && page === 1 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <FlatList
            data={accumulated}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  setPage(1);
                  queryClient.invalidateQueries({
                    queryKey: [...groupsKeys.all, "public"],
                  });
                }}
                tintColor={theme.colors.primary}
                colors={Platform.OS === "android" ? [theme.colors.primary] : undefined}
              />
            }
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              !isFetching ? (
                <View style={styles.emptyResults}>
                  <Ionicons
                    name="globe-outline"
                    size={48}
                    color={theme.colors.textSecondary}
                    style={{ marginBottom: 12, opacity: 0.5 }}
                  />
                  <AppText variant="body" color="secondary">
                    {t("discover.noResults")}
                  </AppText>
                </View>
              ) : null
            }
            ListFooterComponent={
              hasMore ? (
                <View style={styles.footer}>
                  {isFetching ? (
                    <AppText variant="caption" color="secondary">
                      {t("common.loading")}
                    </AppText>
                  ) : (
                    <Button
                      label={t("discover.loadMore")}
                      variant="secondary"
                      onPress={loadMore}
                    />
                  )}
                </View>
              ) : null
            }
          />
        )}
      </View>

      {/* Join with Code Bottom Sheet */}
      <BottomSheetModal
        ref={joinSheetRef}
        enableDynamicSizing
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.colors.background }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary }}
      >
        <BottomSheetView style={styles.joinSheetContent}>
          <AppText variant="title" style={styles.joinSheetTitle}>
            {t("groups.joinWithCode")}
          </AppText>
          <BottomSheetTextInput
            value={inviteCode}
            onChangeText={setInviteCode}
            placeholder={t("groups.inviteCode")}
            placeholderTextColor={theme.colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            style={[
              styles.joinSheetInput,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.textPrimary,
              },
            ]}
          />
          <Button
            label={joinByCodeMutation.isPending ? t("groups.joining") : t("groups.joinGroup")}
            onPress={handleJoinWithCode}
            disabled={!inviteCode.trim() || joinByCodeMutation.isPending}
          />
        </BottomSheetView>
      </BottomSheetModal>

      {/* Group Preview Bottom Sheet */}
      <PreviewSheet
        sheetRef={previewSheetRef}
        group={selectedGroup}
        onJoinSuccess={(groupId) => {
          previewSheetRef.current?.dismiss();
          router.replace(`/groups/${groupId}`);
        }}
      />
    </>
  );
}

// ── Preview Sheet ──────────────────────────────────────────────────────

interface PreviewSheetProps {
  sheetRef: React.RefObject<React.ComponentRef<typeof BottomSheetModal>>;
  group: ApiPublicGroupItem | null;
  onJoinSuccess: (groupId: number) => void;
}

function PreviewSheet({ sheetRef, group, onJoinSuccess }: PreviewSheetProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const joinMutation = useJoinPublicGroupMutation(group?.id ?? null);

  const handleJoin = useCallback(() => {
    if (!group) return;
    joinMutation.mutate(undefined, {
      onSuccess: () => onJoinSuccess(group.id),
    });
  }, [group, joinMutation, onJoinSuccess]);

  if (!group) return null;

  const memberLabel =
    group.maxMembers != null
      ? t("discover.membersWithMax", {
          count: group.memberCount,
          max: group.maxMembers,
        })
      : t("discover.membersCount", { count: group.memberCount });

  const predictionLabel =
    group.predictionMode === "MatchWinner"
      ? t("groupInfo.predictionModeLabels.MatchWinner")
      : t("groupInfo.predictionModeLabels.CorrectScore");

  return (
    <InfoSheet sheetRef={sheetRef} enableDynamicSizing>
      <View style={previewStyles.content}>
        {/* Header with avatar */}
        <View style={previewStyles.headerRow}>
          <GroupAvatar
            avatarType="gradient"
            avatarValue={String(group.id % 8)}
            initials={getInitials(group.name)}
            size={56}
            borderRadius={16}
          />
        </View>
        <AppText variant="title" style={previewStyles.title}>
          {group.name}
        </AppText>
        {group.description ? (
          <AppText
            variant="body"
            color="secondary"
            style={previewStyles.description}
            numberOfLines={3}
          >
            {group.description}
          </AppText>
        ) : null}

        {/* Stats list */}
        <View
          style={[
            previewStyles.stats,
            { backgroundColor: theme.colors.cardBackground },
          ]}
        >
          <PreviewStatRow
            icon="people-outline"
            label={t("groupInfo.members")}
            value={memberLabel}
            theme={theme}
          />
          <View
            style={[
              previewStyles.statDivider,
              { backgroundColor: theme.colors.border },
            ]}
          />
          <PreviewStatRow
            icon="football-outline"
            label={t("lobby.games")}
            value={t("discover.gamesCount", { count: group.totalFixtures })}
            theme={theme}
          />
          {group.predictionMode != null && (
            <>
              <View
                style={[
                  previewStyles.statDivider,
                  { backgroundColor: theme.colors.border },
                ]}
              />
              <PreviewStatRow
                icon="game-controller-outline"
                label={t("groupInfo.predictionMode")}
                value={predictionLabel}
                theme={theme}
              />
            </>
          )}
          {group.creatorUsername != null && (
            <>
              <View
                style={[
                  previewStyles.statDivider,
                  { backgroundColor: theme.colors.border },
                ]}
              />
              <PreviewStatRow
                icon="person-outline"
                label={t("discover.creator")}
                value={`@${group.creatorUsername}`}
                theme={theme}
              />
            </>
          )}
          {group.badge != null && (
            <>
              <View
                style={[
                  previewStyles.statDivider,
                  { backgroundColor: theme.colors.border },
                ]}
              />
              <PreviewStatRow
                icon="ribbon-outline"
                label={group.badge.name}
                value={group.badge.icon}
                theme={theme}
              />
            </>
          )}
        </View>

        {group.isOfficial && (
          <View style={previewStyles.officialRow}>
            <Ionicons name="shield-checkmark" size={14} color="#D4A017" />
            <AppText
              variant="caption"
              style={{ color: "#D4A017", fontWeight: "600" }}
            >
              {t("discover.officialGroup")}
            </AppText>
          </View>
        )}

        {/* Join button */}
        <Button
          label={joinMutation.isPending ? t("groups.joining") : t("discover.join")}
          onPress={handleJoin}
          disabled={joinMutation.isPending}
          icon="enter-outline"
        />
      </View>
    </InfoSheet>
  );
}

function PreviewStatRow({
  icon,
  label,
  value,
  theme,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
  theme: ReturnType<typeof useTheme>["theme"];
}) {
  return (
    <View style={previewStyles.statRow}>
      <Ionicons name={icon} size={18} color={theme.colors.textSecondary} />
      <AppText variant="body" color="secondary" style={previewStyles.statLabel}>
        {label}
      </AppText>
      <AppText variant="body" style={previewStyles.statValue}>
        {value}
      </AppText>
    </View>
  );
}

const previewStyles = StyleSheet.create({
  content: {
    gap: 12,
  },
  headerRow: {
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  description: {
    textAlign: "center",
    lineHeight: 20,
  },
  stats: {
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 10,
  },
  statLabel: {
    flex: 1,
  },
  statValue: {
    fontWeight: "600",
  },
  statDivider: {
    height: StyleSheet.hairlineWidth,
  },
  officialRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
});

// ── Public Group Row ────────────────────────────────────────────────────

interface PublicGroupRowProps {
  group: ApiPublicGroupItem;
  onJoinSuccess: () => void;
  onPreview: () => void;
}

const PublicGroupRow = React.memo(function PublicGroupRow({
  group,
  onJoinSuccess,
  onPreview,
}: PublicGroupRowProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const joinMutation = useJoinPublicGroupMutation(group.id);
  const [isPressed, setIsPressed] = useState(false);

  const handleJoin = () => {
    joinMutation.mutate(undefined, {
      onSuccess: () => {
        onJoinSuccess();
      },
    });
  };

  const initials = getInitials(group.name);
  const avatarValue = String(group.id % 8);

  const memberLabel =
    group.maxMembers != null
      ? t("discover.membersWithMax", {
          count: group.memberCount,
          max: group.maxMembers,
        })
      : t("discover.membersCount", { count: group.memberCount });

  return (
    <View style={cardStyles.container}>
      <Pressable
        onPress={onPreview}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
      >
        <View
          style={[
            cardStyles.shadowWrapper,
            {
              shadowOpacity: isPressed ? 0 : 0.12,
            },
            isPressed && cardStyles.pressed,
          ]}
        >
          <View
            style={[
              cardStyles.card,
              {
                backgroundColor: theme.colors.cardBackground,
                borderColor: theme.colors.border,
                borderBottomColor: theme.colors.textSecondary + "40",
              },
            ]}
          >
            {/* Top Row: Avatar + Info + Join */}
            <View style={cardStyles.topRow}>
              <GroupAvatar
                avatarType="gradient"
                avatarValue={avatarValue}
                initials={initials}
                size={AVATAR_SIZE}
                borderRadius={14}
              />

              <View style={cardStyles.info}>
                <View style={cardStyles.nameRow}>
                  <Text
                    style={[cardStyles.name, { color: theme.colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {group.name}
                  </Text>
                  {group.isOfficial && (
                    <View style={cardStyles.officialBadge}>
                      <Ionicons name="shield-checkmark" size={12} color="#D4A017" />
                    </View>
                  )}
                </View>
                <Text
                  style={[cardStyles.subtitle, { color: theme.colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {memberLabel} · {t("discover.gamesCount", { count: group.totalFixtures })}
                </Text>
                {group.badge && (
                  <Text style={[cardStyles.badgeText, { color: theme.colors.textSecondary }]}>
                    {group.badge.icon} {group.badge.name}
                  </Text>
                )}
              </View>

              <Button
                label={joinMutation.isPending ? t("groups.joining") : t("discover.join")}
                onPress={handleJoin}
                disabled={joinMutation.isPending}
                style={cardStyles.joinButton}
              />
            </View>

            {/* Bottom info row */}
            <View style={[cardStyles.bottomRow, { borderTopColor: theme.colors.border }]}>
              {group.creatorUsername != null && !group.isOfficial ? (
                <View style={cardStyles.creatorRow}>
                  <Ionicons name="person-outline" size={13} color={theme.colors.textSecondary} />
                  <Text style={[cardStyles.bottomText, { color: theme.colors.textSecondary }]}>
                    {t("discover.createdBy", { username: group.creatorUsername })}
                  </Text>
                </View>
              ) : group.isOfficial ? (
                <View style={cardStyles.creatorRow}>
                  <Ionicons name="shield-checkmark" size={13} color="#D4A017" />
                  <Text style={[cardStyles.bottomText, { color: "#D4A017", fontWeight: "600" }]}>
                    {t("discover.officialGroup")}
                  </Text>
                </View>
              ) : (
                <View />
              )}
              <View
                style={[
                  cardStyles.publicBadge,
                  { backgroundColor: theme.colors.textSecondary + "15" },
                ]}
              >
                <Ionicons name="globe-outline" size={12} color={theme.colors.textSecondary} />
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    </View>
  );
});

const cardStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  shadowWrapper: {
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 6,
  },
  pressed: {
    shadowOpacity: 0,
    elevation: 0,
    transform: [{ scale: 0.98 }, { translateY: 2 }],
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderBottomWidth: 3,
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 0,
    overflow: "hidden",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    marginBottom: 2,
  },
  officialBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#D4A01720",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "500",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  joinButton: {
    minWidth: 70,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    marginHorizontal: -14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  creatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  bottomText: {
    fontSize: 12,
    fontWeight: "500",
  },
  publicBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  headerTitle: {
    fontWeight: "600",
    flex: 1,
  },
  backButton: {
    padding: 4,
  },
  headerKeyButton: {
    padding: 8,
  },
  searchRow: {
    paddingBottom: 8,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingBottom: 24,
    paddingTop: 4,
  },
  emptyResults: {
    paddingVertical: 48,
    alignItems: "center",
  },
  footer: {
    alignItems: "center",
    padding: 16,
  },
  // Join with code sheet
  joinSheetContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  joinSheetTitle: {
    textAlign: "center",
    fontWeight: "700",
    fontSize: 18,
  },
  joinSheetInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
});
