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
import { AppText, GroupAvatar } from "@/components/ui";
import { InfoSheet } from "@/components/ui/InfoSheet";
import { useTheme } from "@/lib/theme";
import { getInitials } from "@/utils/string";
import { useDebounce } from "@/hooks/useDebounce";
import {
  usePublicGroupsQuery,
  useJoinPublicGroupMutation,
  useJoinGroupByCodeMutation,
} from "@/domains/groups";
import { groupsKeys } from "@/domains/groups/groups.keys";
import type { ApiPublicGroupItem } from "@repo/types";

const PER_PAGE = 20;
const AVATAR_SIZE = 48;

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
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
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
        onPreview={() => handlePreview(item)}
      />
    ),
    [handlePreview],
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
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => [pressed && { opacity: 0.5 }]}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={theme.colors.textPrimary}
            />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
            {t("groups.discover")}
          </Text>
          <Pressable
            onPress={() => joinSheetRef.current?.present()}
            hitSlop={12}
            style={({ pressed }) => [pressed && { opacity: 0.5 }]}
          >
            <Ionicons
              name="key-outline"
              size={20}
              color={theme.colors.textSecondary}
            />
          </Pressable>
        </View>

        {/* Search field */}
        <View style={styles.searchRow}>
          <View
            style={[
              styles.searchInputContainer,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Ionicons name="search" size={16} color={theme.colors.textSecondary} />
            <TextInput
              value={searchInput}
              onChangeText={setSearchInput}
              placeholder={t("discover.searchPlaceholder")}
              placeholderTextColor={theme.colors.textSecondary + "80"}
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
                hitSlop={8}
              >
                <Ionicons name="close-circle" size={16} color={theme.colors.textSecondary} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Public groups list */}
        {isLoading && page === 1 ? (
          <View style={styles.skeletonContainer}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <View key={i} style={[cardStyles.card, { opacity: 1 - i * 0.15 }]}>
                <View style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: 12, backgroundColor: theme.colors.border }} />
                <View style={cardStyles.info}>
                  <View style={{ width: 90 + i * 16, height: 12, borderRadius: 4, backgroundColor: theme.colors.border, marginBottom: 6 }} />
                  <View style={{ width: 70, height: 10, borderRadius: 3, backgroundColor: theme.colors.border }} />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <FlatList
            data={accumulated}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            removeClippedSubviews={Platform.OS === "android"}
            maxToRenderPerBatch={10}
            initialNumToRender={10}
            windowSize={5}
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
                  <View style={[styles.emptyIconWrapper, { backgroundColor: theme.colors.textSecondary + "10" }]}>
                    <Ionicons
                      name="globe-outline"
                      size={36}
                      color={theme.colors.textSecondary}
                      style={{ opacity: 0.5 }}
                    />
                  </View>
                  <AppText variant="body" color="secondary" style={styles.emptyTitle}>
                    {t("discover.noResults")}
                  </AppText>
                  {searchParam && (
                    <AppText variant="caption" color="secondary" style={styles.emptyHint}>
                      {t("discover.tryDifferentSearch")}
                    </AppText>
                  )}
                </View>
              ) : null
            }
            ListFooterComponent={
              hasMore ? (
                <View style={styles.footer}>
                  {isFetching ? (
                    <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                  ) : (
                    <Pressable
                      onPress={loadMore}
                      style={({ pressed }) => [pressed && { opacity: 0.6 }]}
                    >
                      <AppText variant="caption" color="secondary" style={styles.loadMoreText}>
                        {t("discover.loadMore")}
                      </AppText>
                    </Pressable>
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
        backgroundStyle={{
          backgroundColor: theme.colors.background,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
        }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.border, width: 36 }}
      >
        <BottomSheetView style={styles.joinSheetContent}>
          <Text style={[styles.joinSheetTitle, { color: theme.colors.textPrimary }]}>
            {t("groups.joinWithCode")}
          </Text>
          <BottomSheetTextInput
            value={inviteCode}
            onChangeText={setInviteCode}
            placeholder={t("groups.inviteCode")}
            placeholderTextColor={theme.colors.textSecondary + "60"}
            autoCapitalize="none"
            autoCorrect={false}
            style={[
              styles.joinSheetInput,
              {
                borderBottomColor: theme.colors.border,
                color: theme.colors.textPrimary,
              },
            ]}
          />
          <Pressable
            onPress={handleJoinWithCode}
            disabled={!inviteCode.trim() || joinByCodeMutation.isPending}
            style={({ pressed }) => [
              styles.joinSheetButton,
              {
                backgroundColor: theme.colors.primary,
                opacity: !inviteCode.trim() || joinByCodeMutation.isPending ? 0.4 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text style={styles.joinSheetButtonText}>
              {joinByCodeMutation.isPending ? t("groups.joining") : t("groups.joinGroup")}
            </Text>
          </Pressable>
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

  const memberLabel = group
    ? group.maxMembers != null
      ? t("discover.membersWithMax", {
          count: group.memberCount,
          max: group.maxMembers,
        })
      : t("discover.membersCount", { count: group.memberCount })
    : "";

  const predictionLabel =
    group?.predictionMode === "MatchWinner"
      ? t("groupInfo.predictionModeLabels.MatchWinner")
      : t("groupInfo.predictionModeLabels.CorrectScore");

  return (
    <InfoSheet sheetRef={sheetRef} enableDynamicSizing>
      {group && (
        <View style={previewStyles.content}>
          {/* Header: avatar + name */}
          <View style={previewStyles.headerUnit}>
            <GroupAvatar
              avatarType="gradient"
              avatarValue={String(group.id % 8)}
              initials={getInitials(group.name)}
              size={72}
              borderRadius={18}
              flat
            />
            <View style={previewStyles.nameBlock}>
              <Text style={[previewStyles.title, { color: theme.colors.textPrimary }]} numberOfLines={2}>
                {group.name}
              </Text>
              {group.isOfficial && (
                <View style={previewStyles.officialChip}>
                  <Ionicons name="shield-checkmark" size={12} color="#D4A017" />
                  <Text style={previewStyles.officialText}>
                    {t("discover.officialGroup")}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Description */}
          {group.description ? (
            <Text style={[previewStyles.descriptionText, { color: theme.colors.textSecondary }]} numberOfLines={3}>
              {group.description}
            </Text>
          ) : null}

          {/* Stats */}
          <View style={previewStyles.stats}>
            <PreviewStatRow
              label={t("groupInfo.members")}
              value={memberLabel}
              theme={theme}
            />
            <View style={[previewStyles.statDivider, { backgroundColor: theme.colors.border }]} />
            <PreviewStatRow
              label={t("lobby.games")}
              value={t("discover.gamesCount", { count: group.totalFixtures })}
              theme={theme}
            />
            {group.predictionMode != null && (
              <>
                <View style={[previewStyles.statDivider, { backgroundColor: theme.colors.border }]} />
                <PreviewStatRow
                  label={t("groupInfo.predictionMode")}
                  value={predictionLabel}
                  theme={theme}
                />
              </>
            )}
            {group.creatorUsername != null && (
              <>
                <View style={[previewStyles.statDivider, { backgroundColor: theme.colors.border }]} />
                <PreviewStatRow
                  label={t("discover.creator")}
                  value={`@${group.creatorUsername}`}
                  theme={theme}
                />
              </>
            )}
            {group.badge != null && (
              <>
                <View style={[previewStyles.statDivider, { backgroundColor: theme.colors.border }]} />
                <PreviewStatRow
                  label={group.badge.name}
                  value={group.badge.icon}
                  theme={theme}
                />
              </>
            )}
          </View>

          {/* Join button */}
          <Pressable
            onPress={handleJoin}
            disabled={joinMutation.isPending}
            style={({ pressed }) => [
              previewStyles.joinButton,
              {
                backgroundColor: theme.colors.primary,
                opacity: joinMutation.isPending ? 0.5 : pressed ? 0.85 : 1,
              },
            ]}
          >
            {joinMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={previewStyles.joinButtonText}>{t("discover.join")}</Text>
            )}
          </Pressable>
        </View>
      )}
    </InfoSheet>
  );
}

function PreviewStatRow({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: ReturnType<typeof useTheme>["theme"];
}) {
  return (
    <View style={previewStyles.statRow}>
      <Text style={[previewStyles.statLabel, { color: theme.colors.textSecondary }]}>
        {label}
      </Text>
      <Text style={[previewStyles.statValue, { color: theme.colors.textPrimary }]}>
        {value}
      </Text>
    </View>
  );
}

const previewStyles = StyleSheet.create({
  content: {
    gap: 16,
  },
  headerUnit: {
    alignItems: "center",
    gap: 12,
  },
  nameBlock: {
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  officialChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  officialText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#D4A017",
  },
  descriptionText: {
    lineHeight: 20,
    fontSize: 13,
    textAlign: "center",
  },
  stats: {
    paddingVertical: 4,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: "400",
  },
  statValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  statDivider: {
    height: StyleSheet.hairlineWidth,
  },
  joinButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  joinButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});

// ── Public Group Row ────────────────────────────────────────────────────

interface PublicGroupRowProps {
  group: ApiPublicGroupItem;
  onPreview: () => void;
}

const PublicGroupRow = React.memo(function PublicGroupRow({
  group,
  onPreview,
}: PublicGroupRowProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  const initials = getInitials(group.name);
  const avatarValue = String(group.id % 8);

  const subtitle = [
    t("discover.membersCount", { count: group.memberCount }),
    t("discover.gamesCount", { count: group.totalFixtures }),
  ].join(" · ");

  return (
    <View style={cardStyles.container}>
      <Pressable
        onPress={onPreview}
        style={({ pressed }) => [
          cardStyles.card,
          pressed && { opacity: 0.7 },
        ]}
      >
        <GroupAvatar
          avatarType="gradient"
          avatarValue={avatarValue}
          initials={initials}
          size={AVATAR_SIZE}
          borderRadius={12}
          flat
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
              <Ionicons name="shield-checkmark" size={13} color="#D4A017" />
            )}
          </View>
          <Text
            style={[cardStyles.subtitle, { color: theme.colors.textSecondary }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
      </Pressable>
    </View>
  );
});

const cardStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "400",
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
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
  },
  skeletonContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  listContent: {
    paddingBottom: 24,
    paddingTop: 4,
  },
  emptyResults: {
    paddingVertical: 56,
    alignItems: "center",
    gap: 8,
  },
  emptyIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontWeight: "600",
  },
  emptyHint: {
    opacity: 0.6,
  },
  footer: {
    alignItems: "center",
    padding: 16,
  },
  loadMoreText: {
    fontWeight: "600",
  },
  // Join with code sheet
  joinSheetContent: {
    paddingHorizontal: 24,
    paddingBottom: 36,
    gap: 16,
  },
  joinSheetTitle: {
    textAlign: "center",
    fontWeight: "600",
    fontSize: 15,
  },
  joinSheetInput: {
    borderBottomWidth: 1,
    paddingVertical: 10,
    fontSize: 16,
  },
  joinSheetButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  joinSheetButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
