// app/(tabs)/groups.tsx
// Groups tab - main screen
// - Shows list of user's groups with filter tabs: All, Attention, Active, Drafts, Ended.
// - Empty state when no groups exist.
// - Navigates to group details on press.

import React, { useState, useCallback, useRef, useMemo, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  RefreshControl,
  Platform,
  FlatList,
  Text,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { Screen, AppText, Button } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useQueryClient } from "@tanstack/react-query";
import { useMyGroupsQuery, useUnreadCountsQuery, useUnreadActivityCountsQuery, groupsKeys, fetchGroupById } from "@/domains/groups";
import { useMyInvitesQuery } from "@/domains/invites";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";
import {
  GroupCard,
  GroupCardRow,
  GroupSortRow,
  FilterSortSheet,
  GroupsInfoSheet,
} from "@/features/groups/group-list/components";
import type { GroupViewMode } from "@/features/groups/group-list/components/GroupSortRow";
import { useGroupFilter } from "@/features/groups/group-list/hooks";
import type { ApiGroupItem } from "@repo/types";
import { PredictAllBanner } from "@/features/groups/predictions/components/PredictAllBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GroupsListSkeleton } from "@/features/groups/group-list/components/GroupsListSkeleton";
import { CreateGroupSheet, createStyles, type CreateTab } from "@/features/group-creation/components";

/* ─── Groups Screen ─── */

export default function GroupsScreen() {
  return (
    <ErrorBoundary feature="groups-list">
      <GroupsContent />
    </ErrorBoundary>
  );
}

function GroupsContent() {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { data, isLoading, error, refetch } = useMyGroupsQuery();
  const { data: unreadData, refetch: refetchUnread, isLoading: isUnreadLoading } = useUnreadCountsQuery();
  const unreadCounts = unreadData?.data ?? {};
  const { data: unreadActivityData, isLoading: isActivityLoading } = useUnreadActivityCountsQuery();
  const unreadActivityCounts = unreadActivityData?.data ?? {};
  const isHudLoading = isUnreadLoading || isActivityLoading;
  const { data: invitesData } = useMyInvitesQuery({ status: "pending" });
  const pendingInviteCount = invitesData?.data?.invites?.length ?? 0;
  const [refreshing, setRefreshing] = useState(false);
  const [isTabsSticky, setIsTabsSticky] = useState(false);
  const [viewMode, setViewMode] = useState<GroupViewMode>("card");

  const isTabsStickyRef = useRef(false);
  const headerHeightRef = useRef(0);
  const infoSheetRef = useRef<BottomSheetModal>(null);
  const createSheetRef = useRef<BottomSheetModal>(null);
  const createSortSheetRef = useRef<BottomSheetModal>(null);
  const filterSortSheetRef = useRef<BottomSheetModal>(null);
  const advPredictionRef = useRef<BottomSheetModal>(null);
  const advScoringRef = useRef<BottomSheetModal>(null);
  const advKoRef = useRef<BottomSheetModal>(null);
  const advMembersRef = useRef<BottomSheetModal>(null);
  const advNudgeWindowRef = useRef<BottomSheetModal>(null);
  const avatarPickerRef = useRef<BottomSheetModal>(null);
  const [createAvatarValue, setCreateAvatarValue] = useState("0");
  const [createNudgeWindowMinutes, setCreateNudgeWindowMinutes] = useState(60);
  const [createInviteAccess, setCreateInviteAccess] = useState<"all" | "admin_only">("all");
  const [createOnTheNosePoints, setCreateOnTheNosePoints] = useState(3);
  const [createDifferencePoints, setCreateDifferencePoints] = useState(2);
  const [createOutcomePoints, setCreateOutcomePoints] = useState(1);
  const [createPredictionMode, setCreatePredictionMode] = useState<"CorrectScore" | "ThreeWay">("CorrectScore");
  const [createKoRoundMode, setCreateKoRoundMode] = useState<"FullTime" | "ExtraTime" | "Penalties">("FullTime");
  const [createMaxMembers, setCreateMaxMembers] = useState(50);
  const [createNudgeEnabled, setCreateNudgeEnabled] = useState(true);
  const initialNudgeEnabled = useRef(true);
  const initialPredictionMode = useRef(createPredictionMode);
  const initialKoRoundMode = useRef(createKoRoundMode);
  const initialMaxMembers = useRef(createMaxMembers);
  const initialNudgeWindow = useRef(createNudgeWindowMinutes);
  const initialOnTheNose = useRef(createOnTheNosePoints);
  const initialDifference = useRef(createDifferencePoints);
  const initialOutcome = useRef(createOutcomePoints);
  const [createTabSortOptions, setCreateTabSortOptions] = useState<Record<CreateTab, string>>({
    fixtures: "time",
    leagues: "time",
    teams: "time",
  });
  const createSortActiveTabRef = useRef<CreateTab>("fixtures");

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const sticky =
        headerHeightRef.current > 0 &&
        e.nativeEvent.contentOffset.y >= headerHeightRef.current;
      if (sticky !== isTabsStickyRef.current) {
        isTabsStickyRef.current = sticky;
        setIsTabsSticky(sticky);
      }
    },
    [],
  );

  const handleOpenInfo = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    infoSheetRef.current?.present();
  }, []);

  const handleOpenCreate = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    createSheetRef.current?.present();
  }, []);

  const handleOpenFilterSort = useCallback(() => {
    filterSortSheetRef.current?.present();
  }, []);

  const CREATE_SORT_OPTIONS = useMemo(() => [
    { key: "time", labelKey: "groupCreation.sortByTime" },
    { key: "league", labelKey: "groupCreation.sortByLeague" },
  ], []);

  const handleOpenCreateSort = useCallback((tab: CreateTab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    createSortActiveTabRef.current = tab;
    createSortSheetRef.current?.present();
  }, []);

  const handleOpenAdvSheet = useCallback((sheet: "prediction" | "scoring" | "ko" | "members" | "nudgeWindow") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (sheet === "prediction") initialPredictionMode.current = createPredictionMode;
    if (sheet === "ko") initialKoRoundMode.current = createKoRoundMode;
    if (sheet === "members") initialMaxMembers.current = createMaxMembers;
    if (sheet === "nudgeWindow") { initialNudgeWindow.current = createNudgeWindowMinutes; initialNudgeEnabled.current = createNudgeEnabled; }
    if (sheet === "scoring") {
      initialOnTheNose.current = createOnTheNosePoints;
      initialDifference.current = createDifferencePoints;
      initialOutcome.current = createOutcomePoints;
    }
    const refs = { prediction: advPredictionRef, scoring: advScoringRef, ko: advKoRef, members: advMembersRef, nudgeWindow: advNudgeWindowRef };
    refs[sheet].current?.present();
  }, [createPredictionMode, createKoRoundMode, createMaxMembers, createNudgeWindowMinutes, createNudgeEnabled, createOnTheNosePoints, createDifferencePoints, createOutcomePoints]);

  const handleOpenAvatarPicker = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    avatarPickerRef.current?.present();
  }, []);

  const handleSelectCreateSort = useCallback((key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const tab = createSortActiveTabRef.current;
    setCreateTabSortOptions((prev) => ({ ...prev, [tab]: key }));
    createSortSheetRef.current?.dismiss();
  }, []);

  const handleToggleViewMode = useCallback(() => {
    setViewMode((prev) => (prev === "card" ? "row" : "card"));
  }, []);

  const handleOpenInvites = useCallback(() => {
    router.push("/invites" as any);
  }, [router]);

  const handleOpenSearch = useCallback(() => {
    router.push("/groups/search" as any);
  }, [router]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), refetchUnread()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetch, refetchUnread]);

  const handleCreateGroup = () => {
    router.push("/(tabs)/home" as any);
  };

  const handleJoinWithCode = useCallback(() => {
    router.push("/groups/join");
  }, [router]);

  const handleBrowsePublic = useCallback(() => {
    router.push("/groups/discover");
  }, [router]);

  const handleGroupPress = useCallback((groupId: number) => {
    router.push(`/groups/${groupId}` as any);
  }, [router]);

  const renderCreateBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
      />
    ),
    [],
  );

  const groups = data?.data || [];
  const { selectedFilter, setSelectedFilter, selectedSort, setSelectedSort, filteredGroups, counts } =
    useGroupFilter(groups);

  // Build list data: header, tabs, sortRow, then groups
  type ListItem =
    | { type: "header" }
    | { type: "sortRow" }
    | { type: "banner" }
    | { type: "group"; data: ApiGroupItem };

  const hasUnpredicted = groups.some(
    (g) => g.status === "active" && (g.unpredictedGamesCount ?? 0) > 0
  );

  // Prefetch first predictable group's fixtures for instant Predict All load
  const queryClient = useQueryClient();
  React.useEffect(() => {
    if (!hasUnpredicted) return;
    const first = groups.find(
      (g) => g.status === "active" && (g.unpredictedGamesCount ?? 0) > 0
    );
    if (first) {
      queryClient.prefetchQuery({
        queryKey: groupsKeys.detail(first.id, true),
        queryFn: () => fetchGroupById(first.id, { include: "fixtures" }),
        meta: { scope: "user" },
      });
    }
  }, [hasUnpredicted, groups, queryClient]);

  const listData = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [
      { type: "header" },
    ];
    if (hasUnpredicted) {
      items.push({ type: "banner" });
    }
    items.push({ type: "sortRow" });
    filteredGroups.forEach((g) => items.push({ type: "group", data: g }));
    return items;
  }, [filteredGroups, hasUnpredicted]);

  const renderListItem = useCallback(({ item }: { item: ListItem }) => {
    if (item.type === "header") {
      return (
        <View
          style={[styles.header, { backgroundColor: theme.colors.background }]}
          onLayout={(e) => { headerHeightRef.current = e.nativeEvent.layout.height; }}
        >
          {/* Row 1: Title + Invites badge + Info */}
          <View style={styles.headerTop}>
            <AppText variant="title" style={styles.headerTitle}>
              {t("groups.title")}
            </AppText>
            <View style={styles.headerActions}>
              <Pressable
                onPress={handleOpenSearch}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={({ pressed }) => [
                  styles.infoButton,
                  pressed && { opacity: 0.5 },
                ]}
              >
                <Ionicons
                  name="search-outline"
                  size={26}
                  color={theme.colors.textPrimary}
                />
              </Pressable>
              <Pressable
                onPress={handleOpenInvites}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={({ pressed }) => [
                  styles.infoButton,
                  pressed && { opacity: 0.5 },
                ]}
              >
                <Ionicons
                  name={pendingInviteCount > 0 ? "mail" : "mail-outline"}
                  size={26}
                  color={theme.colors.textPrimary}
                />
                {pendingInviteCount > 0 && (
                  <View style={styles.inviteBadge}>
                    <AppText style={styles.inviteBadgeText}>
                      {pendingInviteCount > 9 ? "9+" : String(pendingInviteCount)}
                    </AppText>
                  </View>
                )}
              </Pressable>
              <Pressable
                onPress={handleOpenCreate}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={({ pressed }) => [
                  styles.infoButton,
                  pressed && { opacity: 0.5 },
                ]}
              >
                <Ionicons
                  name="add-outline"
                  size={30}
                  color={theme.colors.textPrimary}
                />
              </Pressable>
              {/* TODO: restore info button in future iteration
              <Pressable
                onPress={handleOpenInfo}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={({ pressed }) => [
                  styles.infoButton,
                  pressed && { opacity: 0.5 },
                ]}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={22}
                  color={theme.colors.textSecondary}
                />
              </Pressable>
              */}
            </View>
          </View>
        </View>
      );
    }

    if (item.type === "sortRow") {
      return (
        <GroupSortRow
          selectedFilter={selectedFilter}
          selectedSort={selectedSort}
          viewMode={viewMode}
          onFilterSortPress={handleOpenFilterSort}
          onViewModeToggle={handleToggleViewMode}
        />
      );
    }

    if (item.type === "banner") {
      return <PredictAllBanner />;
    }

    // Group card or compact row
    if (viewMode === "row") {
      return (
        <GroupCardRow
          group={item.data}
          onPress={handleGroupPress}
        />
      );
    }

    return (
      <GroupCard
        group={item.data}
        onPress={handleGroupPress}
        unreadCount={unreadCounts[String(item.data.id)] ?? 0}
        unreadActivityCount={unreadActivityCounts[String(item.data.id)] ?? 0}
        isHudLoading={isHudLoading}
      />
    );
  }, [theme, handleOpenCreate, handleOpenInfo, handleOpenInvites, handleOpenSearch, handleOpenFilterSort, handleToggleViewMode, viewMode, pendingInviteCount, isTabsSticky, selectedFilter, selectedSort, handleGroupPress, unreadCounts, unreadActivityCounts, isHudLoading]);

  // Loading state — skeleton
  if (isLoading) {
    return <GroupsListSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <View style={styles.root}>
        <QueryErrorView
          message={t("groups.failedLoadGroups")}
          onRetry={() => refetch()}
        />
      </View>
    );
  }

  // Empty state — user has no groups
  if (groups.length === 0) {
    return (
      <View style={styles.root}>
        <Screen>
          <View style={styles.emptyContainer}>
            <AppText variant="title" style={styles.emptyTitle}>
              {t("groups.noGroupsYet")}
            </AppText>
            <AppText
              variant="body"
              color="secondary"
              style={styles.emptySubtitle}
            >
              {t("groups.noGroupsSubtitle")}
            </AppText>
            <Button
              label={t("groupCreation.createGroup")}
              variant="primary"
              onPress={handleCreateGroup}
              style={[
                styles.createGroupButton,
                { marginTop: theme.spacing.lg },
              ]}
            />
            <View
              style={[styles.secondaryActions, { marginTop: theme.spacing.xl }]}
            >
              <Pressable
                onPress={handleJoinWithCode}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={({ pressed }) => [
                  styles.secondaryAction,
                  pressed && styles.secondaryActionPressed,
                ]}
              >
                <AppText
                  variant="body"
                  color="secondary"
                  style={styles.secondaryActionText}
                >
                  {t("groups.joinWithCode")}
                </AppText>
              </Pressable>
              <AppText
                variant="body"
                color="secondary"
                style={styles.secondaryActionSeparator}
              >
                ·
              </AppText>
              <Pressable
                onPress={handleBrowsePublic}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={({ pressed }) => [
                  styles.secondaryAction,
                  pressed && styles.secondaryActionPressed,
                ]}
              >
                <AppText
                  variant="body"
                  color="secondary"
                  style={styles.secondaryActionText}
                >
                  {t("groups.browsePublicGroups")}
                </AppText>
              </Pressable>
            </View>
          </View>
        </Screen>
      </View>
    );
  }

  const tabBarHeight = 60 + insets.bottom;
  const tabBarMarginBottom = theme.spacing.sm;
  const totalTabBarSpace = tabBarHeight + tabBarMarginBottom;

  const getItemKey = (item: ListItem, index: number) => {
    if (item.type === "header") return "header";
    if (item.type === "sortRow") return "sortRow";
    if (item.type === "banner") return "predictAllBanner";
    return String(item.data.id);
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <Screen
        scroll={false}
        contentContainerStyle={{ alignItems: "stretch", flex: 1, padding: 0 }}
      >
        <FlatList
          style={styles.list}
          data={listData}
          keyExtractor={getItemKey}
          renderItem={renderListItem}
          stickyHeaderIndices={[0]}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          windowSize={5}
          maxToRenderPerBatch={5}
          initialNumToRender={7}
          removeClippedSubviews={Platform.OS === "android"}
          ListFooterComponent={
            filteredGroups.length === 0 ? (
              <View style={styles.emptyFilter}>
                <Ionicons
                  name="folder-open-outline"
                  size={48}
                  color={theme.colors.textSecondary}
                  style={{ marginBottom: 12, opacity: 0.5 }}
                />
                <AppText variant="body" color="secondary">
                  {t("groups.noGroupsInFilter")}
                </AppText>
              </View>
            ) : null
          }
          contentContainerStyle={{
            paddingBottom: totalTabBarSpace + theme.spacing.md,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
              colors={
                Platform.OS === "android" ? [theme.colors.primary] : undefined
              }
            />
          }
        />
      </Screen>
      <GroupsInfoSheet sheetRef={infoSheetRef} />

      <CreateGroupSheet
        sheetRef={createSheetRef}
        topInset={insets.top}
        backdropComponent={renderCreateBackdrop}
        tabSortOptions={createTabSortOptions}
        onOpenSort={handleOpenCreateSort}
        onOpenAdvSheet={handleOpenAdvSheet}
        onOpenAvatarPicker={handleOpenAvatarPicker}
        avatarValue={createAvatarValue}
        nudgeEnabled={createNudgeEnabled}
        nudgeWindowMinutes={createNudgeWindowMinutes}
        inviteAccess={createInviteAccess}
        onNudgeWindowChange={setCreateNudgeWindowMinutes}
        onInviteAccessChange={setCreateInviteAccess}
        onTheNosePoints={createOnTheNosePoints}
        differencePoints={createDifferencePoints}
        outcomePoints={createOutcomePoints}
        predictionMode={createPredictionMode}
        koRoundMode={createKoRoundMode}
        maxMembers={createMaxMembers}
        groupCount={groups.length}
      />

      {/* Create sort sheet — sibling of CreateGroupSheet */}
      <BottomSheetModal
        ref={createSortSheetRef}
        stackBehavior="push"
        enableDynamicSizing
        enablePanDownToClose
        backdropComponent={renderCreateBackdrop}
        backgroundStyle={{
          backgroundColor: theme.colors.background,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary }}
      >
        <BottomSheetView style={createStyles.sortSheet}>
          <Text style={[createStyles.sortSheetTitle, { color: theme.colors.textSecondary }]}>
            {t("groupCreation.sortBy")}
          </Text>
          {CREATE_SORT_OPTIONS.map((option) => {
            const isActive = createTabSortOptions[createSortActiveTabRef.current] === option.key;
            return (
              <Pressable
                key={option.key}
                onPress={() => handleSelectCreateSort(option.key)}
                style={({ pressed }) => [
                  createStyles.sortSheetItem,
                  { opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <Text
                  style={[
                    createStyles.sortSheetItemText,
                    { color: isActive ? theme.colors.primary : theme.colors.textPrimary },
                  ]}
                >
                  {t(option.labelKey)}
                </Text>
                {isActive && (
                  <Ionicons name="checkmark" size={22} color={theme.colors.primary} />
                )}
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => createSortSheetRef.current?.dismiss()}
            style={({ pressed }) => [
              createStyles.sortSheetCancel,
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Text style={[createStyles.sortSheetCancelText, { color: theme.colors.textSecondary }]}>
              {t("groupCreation.cancel")}
            </Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>

      <FilterSortSheet
        sheetRef={filterSortSheetRef}
        selectedFilter={selectedFilter}
        selectedSort={selectedSort}
        onFilterChange={setSelectedFilter}
        onSortChange={setSelectedSort}
        counts={counts}
      />

      {/* Advanced settings sheets */}
      <BottomSheetModal ref={advPredictionRef} stackBehavior="push" enableDynamicSizing enablePanDownToClose backdropComponent={renderCreateBackdrop} backgroundStyle={{ backgroundColor: theme.colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20 }} handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary }}>
        <BottomSheetView style={createStyles.sheetContent}>
          <Text style={[createStyles.sheetTitle, { color: theme.colors.textPrimary, borderBottomColor: theme.colors.textPrimary + "10" }]}>{t("lobby.predictionMode")}</Text>
          {([
            { value: "CorrectScore" as const, label: t("lobby.exactResult") },
            { value: "ThreeWay" as const, label: t("lobby.matchWinner") },
          ]).map((opt) => (
            <Pressable key={opt.value} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCreatePredictionMode(opt.value); }} style={({ pressed }) => [createStyles.sheetOption, { opacity: pressed ? 0.6 : 1 }]}>
              <Text style={[createStyles.sheetOptionLabel, { color: theme.colors.textPrimary }]}>{opt.label}</Text>
              <Ionicons name={opt.value === createPredictionMode ? "radio-button-on" : "radio-button-off"} size={18} color={opt.value === createPredictionMode ? theme.colors.primary : theme.colors.textSecondary} />
            </Pressable>
          ))}
          <Pressable
            onPress={() => advPredictionRef.current?.dismiss()}
            disabled={createPredictionMode === initialPredictionMode.current}
            style={({ pressed }) => [createStyles.sheetDoneBtn, { backgroundColor: theme.colors.primary, opacity: createPredictionMode === initialPredictionMode.current ? 0.4 : pressed ? 0.8 : 1 }]}
          >
            <Text style={createStyles.sheetDoneBtnText}>{t("done")}</Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>

      <BottomSheetModal ref={advScoringRef} stackBehavior="push" enableDynamicSizing enablePanDownToClose backdropComponent={renderCreateBackdrop} backgroundStyle={{ backgroundColor: theme.colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20 }} handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary }}>
        <BottomSheetView style={createStyles.sheetContent}>
          <Text style={[createStyles.sheetTitle, { color: theme.colors.textPrimary, borderBottomColor: theme.colors.textPrimary + "10" }]}>{t("lobby.scoring")}</Text>
          {[
            { label: t("lobby.onTheNose"), value: createOnTheNosePoints, set: setCreateOnTheNosePoints },
            { label: t("lobby.goalPointDifference"), value: createDifferencePoints, set: setCreateDifferencePoints },
            { label: t("lobby.outcome"), value: createOutcomePoints, set: setCreateOutcomePoints },
          ].map((opt) => (
            <View key={opt.label} style={[createStyles.sheetOption]}>
              <Text style={[createStyles.sheetOptionLabel, { color: theme.colors.textPrimary }]}>{opt.label}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Pressable
                  onPress={() => { if (opt.value > 0) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); opt.set(opt.value - 1); } }}
                  hitSlop={8}
                  style={{ opacity: opt.value > 0 ? 1 : 0.3 }}
                >
                  <Ionicons name="remove-circle-outline" size={24} color={theme.colors.textPrimary} />
                </Pressable>
                <Text style={{ color: theme.colors.textPrimary, fontWeight: "700", fontSize: 16, minWidth: 20, textAlign: "center" }}>{opt.value}</Text>
                <Pressable
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); opt.set(opt.value + 1); }}
                  hitSlop={8}
                >
                  <Ionicons name="add-circle-outline" size={24} color={theme.colors.textPrimary} />
                </Pressable>
              </View>
            </View>
          ))}
          <Pressable
            onPress={() => advScoringRef.current?.dismiss()}
            disabled={createOnTheNosePoints === initialOnTheNose.current && createDifferencePoints === initialDifference.current && createOutcomePoints === initialOutcome.current}
            style={({ pressed }) => {
              const unchanged = createOnTheNosePoints === initialOnTheNose.current && createDifferencePoints === initialDifference.current && createOutcomePoints === initialOutcome.current;
              return [createStyles.sheetDoneBtn, { backgroundColor: theme.colors.primary, opacity: unchanged ? 0.4 : pressed ? 0.8 : 1 }];
            }}
          >
            <Text style={createStyles.sheetDoneBtnText}>{t("done")}</Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>

      <BottomSheetModal ref={advKoRef} stackBehavior="push" enableDynamicSizing enablePanDownToClose backdropComponent={renderCreateBackdrop} backgroundStyle={{ backgroundColor: theme.colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20 }} handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary }}>
        <BottomSheetView style={createStyles.sheetContent}>
          <Text style={[createStyles.sheetTitle, { color: theme.colors.textPrimary, borderBottomColor: theme.colors.textPrimary + "10" }]}>{t("lobby.koRoundMode")}</Text>
          {([
            { value: "FullTime" as const, label: t("lobby.90min") },
            { value: "ExtraTime" as const, label: t("lobby.extraTime") },
            { value: "Penalties" as const, label: t("lobby.penalties") },
          ]).map((opt) => (
            <Pressable key={opt.value} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCreateKoRoundMode(opt.value); }} style={({ pressed }) => [createStyles.sheetOption, { opacity: pressed ? 0.6 : 1 }]}>
              <Text style={[createStyles.sheetOptionLabel, { color: theme.colors.textPrimary }]}>{opt.label}</Text>
              <Ionicons name={opt.value === createKoRoundMode ? "radio-button-on" : "radio-button-off"} size={18} color={opt.value === createKoRoundMode ? theme.colors.primary : theme.colors.textSecondary} />
            </Pressable>
          ))}
          <Pressable
            onPress={() => advKoRef.current?.dismiss()}
            disabled={createKoRoundMode === initialKoRoundMode.current}
            style={({ pressed }) => [createStyles.sheetDoneBtn, { backgroundColor: theme.colors.primary, opacity: createKoRoundMode === initialKoRoundMode.current ? 0.4 : pressed ? 0.8 : 1 }]}
          >
            <Text style={createStyles.sheetDoneBtnText}>{t("done")}</Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>

      <BottomSheetModal ref={advMembersRef} stackBehavior="push" enableDynamicSizing enablePanDownToClose backdropComponent={renderCreateBackdrop} backgroundStyle={{ backgroundColor: theme.colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20 }} handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary }}>
        <BottomSheetView style={createStyles.sheetContent}>
          <Text style={[createStyles.sheetTitle, { color: theme.colors.textPrimary, borderBottomColor: theme.colors.textPrimary + "10" }]}>{t("lobby.maxMembers")}</Text>
          {[10, 20, 30, 50, 100].map((num) => (
            <Pressable key={num} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCreateMaxMembers(num); }} style={({ pressed }) => [createStyles.sheetOption, { opacity: pressed ? 0.6 : 1 }]}>
              <Text style={[createStyles.sheetOptionLabel, { color: theme.colors.textPrimary }]}>{num}</Text>
              <Ionicons name={num === createMaxMembers ? "radio-button-on" : "radio-button-off"} size={18} color={num === createMaxMembers ? theme.colors.primary : theme.colors.textSecondary} />
            </Pressable>
          ))}
          <Pressable
            onPress={() => advMembersRef.current?.dismiss()}
            disabled={createMaxMembers === initialMaxMembers.current}
            style={({ pressed }) => [createStyles.sheetDoneBtn, { backgroundColor: theme.colors.primary, opacity: createMaxMembers === initialMaxMembers.current ? 0.4 : pressed ? 0.8 : 1 }]}
          >
            <Text style={createStyles.sheetDoneBtnText}>{t("done")}</Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>

      {/* Nudge sheet */}
      <BottomSheetModal ref={advNudgeWindowRef} stackBehavior="push" enableDynamicSizing enablePanDownToClose backdropComponent={renderCreateBackdrop} backgroundStyle={{ backgroundColor: theme.colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20 }} handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary }}>
        <BottomSheetView style={createStyles.sheetContent}>
          <View style={{ borderBottomWidth: 1, borderBottomColor: theme.colors.textPrimary + "10", paddingBottom: 12, marginBottom: 8 }}>
            <Text style={{ fontSize: 15, fontWeight: "600", textAlign: "center", color: theme.colors.textPrimary }}>{t("lobby.nudge")}</Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12, lineHeight: 17, textAlign: "center", marginTop: 4 }}>{t("lobby.nudgeDescription")}</Text>
          </View>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCreateNudgeEnabled((prev) => !prev); }}
            style={createStyles.sheetOption}
          >
            <Text style={[createStyles.sheetOptionLabel, { color: theme.colors.textPrimary }]}>{t("lobby.nudge")}</Text>
            <View style={[createStyles.advToggle, { backgroundColor: createNudgeEnabled ? theme.colors.primary : theme.colors.textSecondary + "30" }]}>
              <View style={[createStyles.advToggleKnob, { alignSelf: createNudgeEnabled ? "flex-end" : "flex-start" }]} />
            </View>
          </Pressable>
          <View style={{ opacity: createNudgeEnabled ? 1 : 0.35 }} pointerEvents={createNudgeEnabled ? "auto" : "none"}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontWeight: "500", marginBottom: 4, marginTop: 8 }}>{t("lobby.minutesBeforeKickoff")}</Text>
            {[30, 60, 120, 180].map((min) => (
              <Pressable key={min} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCreateNudgeWindowMinutes(min); }} style={({ pressed }) => [createStyles.sheetOption, { opacity: pressed ? 0.6 : 1 }]}>
                <Text style={[createStyles.sheetOptionLabel, { color: theme.colors.textPrimary }]}>{min} min</Text>
                <Ionicons name={min === createNudgeWindowMinutes ? "radio-button-on" : "radio-button-off"} size={18} color={min === createNudgeWindowMinutes ? theme.colors.primary : theme.colors.textSecondary} />
              </Pressable>
            ))}
          </View>
          <Pressable
            onPress={() => advNudgeWindowRef.current?.dismiss()}
            disabled={createNudgeEnabled === initialNudgeEnabled.current && createNudgeWindowMinutes === initialNudgeWindow.current}
            style={({ pressed }) => {
              const unchanged = createNudgeEnabled === initialNudgeEnabled.current && createNudgeWindowMinutes === initialNudgeWindow.current;
              return [createStyles.sheetDoneBtn, { backgroundColor: theme.colors.primary, opacity: unchanged ? 0.4 : pressed ? 0.8 : 1 }];
            }}
          >
            <Text style={createStyles.sheetDoneBtnText}>{t("done")}</Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>

      {/* Avatar picker sheet */}
      <BottomSheetModal
        ref={avatarPickerRef}
        stackBehavior="push"
        enableDynamicSizing
        enablePanDownToClose
        backdropComponent={renderCreateBackdrop}
        backgroundStyle={{ backgroundColor: theme.colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary }}
      >
        <BottomSheetView style={createStyles.sheetContent}>
          <Text style={[createStyles.sheetTitle, { color: theme.colors.textPrimary, borderBottomColor: theme.colors.textPrimary + "10" }]}>{t("lobby.chooseAvatar")}</Text>
          <View style={createStyles.avatarGrid}>
            {AVATAR_GRADIENTS.map((colors, index) => {
              const isSelected = String(index) === createAvatarValue;
              return (
                <Pressable
                  key={index}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setCreateAvatarValue(String(index));
                    avatarPickerRef.current?.dismiss();
                  }}
                  style={{ alignItems: "center", position: "relative" }}
                >
                  <LinearGradient
                    colors={colors as unknown as [string, string]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      createStyles.avatarGridItem,
                      isSelected && { borderColor: theme.colors.primary, borderWidth: 3 },
                    ]}
                  >
                    <Text style={{ fontWeight: "800", fontSize: 20, color: "#fff" }}>GR</Text>
                  </LinearGradient>
                  {isSelected && (
                    <View style={{ position: "absolute", bottom: -4, right: -4, backgroundColor: "#fff", borderRadius: 10, width: 20, height: 20, justifyContent: "center", alignItems: "center" }}>
                      <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingTop: 12,
    paddingBottom: 0,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontWeight: "800",
    fontSize: 24,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  infoButton: {
    padding: 4,
  },
  inviteBadge: {
    position: "absolute",
    top: -2,
    right: -4,
    backgroundColor: "#EF4444",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  inviteBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 14,
  },
  searchPlaceholder: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchPlaceholderText: {
    fontSize: 15,
  },
  list: {
    flex: 1,
  },
  tabsStickyDropShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  emptyFilter: {
    paddingVertical: 48,
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyTitle: {
    marginBottom: 12,
    textAlign: "center",
  },
  emptySubtitle: {
    textAlign: "center",
  },
  createGroupButton: {
    width: "100%",
  },
  secondaryActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  secondaryAction: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  secondaryActionPressed: {
    opacity: 0.7,
  },
  secondaryActionText: {
    textDecorationLine: "underline",
  },
  secondaryActionSeparator: {
    opacity: 0.6,
  },
  createSheetContent: {
    flex: 1,
    padding: 20,
  },
});
