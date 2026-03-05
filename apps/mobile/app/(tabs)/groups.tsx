// app/(tabs)/groups.tsx
// Groups tab - main screen
// - Shows list of user's groups with filter tabs: All, Attention, Active, Drafts, Ended.
// - Empty state when no groups exist.
// - Navigates to group details on press.

import React, { useState, useCallback, useRef, useMemo, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View,
  StyleSheet,
  Pressable,
  RefreshControl,
  Platform,
  FlatList,
  ScrollView,
  Text,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  SlideInRight,
  SlideInDown,
  FadeIn,
} from "react-native-reanimated";
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
import { Screen, AppText, Button, TeamLogo, GroupAvatar } from "@/components/ui";
import { useTheme, CARD_BORDER_BOTTOM_WIDTH } from "@/lib/theme";
import { useQueryClient } from "@tanstack/react-query";
import { useMyGroupsQuery, useUnreadCountsQuery, useUnreadActivityCountsQuery, useCreateGroupMutation, useGroupPreviewQuery, groupsKeys, fetchGroupById } from "@/domains/groups";
import { publishGroup } from "@/domains/groups/groups-core.api";
import { useMyInvitesQuery } from "@/domains/invites";
import { AVATAR_GRADIENTS } from "@/lib/constants/avatarGradients";
import { LinearGradient } from "expo-linear-gradient";
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
import { addDays, format, isToday, isSameDay, startOfDay, endOfDay } from "date-fns";
import { useUpcomingFixturesQuery } from "@/domains/fixtures";
import { useLeaguesQuery } from "@/domains/leagues";
import { useTeamsQuery } from "@/domains/teams";

/* ─── Create Group Sheet ─── */

type CreateTab = "fixtures" | "leagues" | "teams";

const CREATE_TABS: { key: CreateTab; labelKey: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "fixtures", labelKey: "groupCreation.freeSelection", icon: "grid-outline" },
  { key: "leagues", labelKey: "groupCreation.leagues", icon: "trophy-outline" },
  { key: "teams", labelKey: "groupCreation.teams", icon: "shirt-outline" },
];

function CreateGroupSheet({
  sheetRef,
  topInset,
  backdropComponent,
  onOpenSort,
  onOpenAdvSheet,
  onOpenAvatarPicker,
  avatarValue,
  nudgeWindowMinutes,
  inviteAccess,
  onNudgeWindowChange,
  onInviteAccessChange,
  onTheNosePoints,
  differencePoints,
  outcomePoints,
  tabSortOptions,
  groupCount,
}: {
  sheetRef: React.RefObject<React.ComponentRef<typeof BottomSheetModal>>;
  topInset: number;
  backdropComponent: (props: BottomSheetBackdropProps) => React.JSX.Element;
  onOpenSort: (tab: CreateTab) => void;
  onOpenAdvSheet: (sheet: "prediction" | "scoring" | "ko" | "members" | "nudgeWindow") => void;
  onOpenAvatarPicker: () => void;
  avatarValue: string;
  nudgeWindowMinutes: number;
  inviteAccess: "all" | "admin_only";
  onNudgeWindowChange: (val: number) => void;
  onInviteAccessChange: (val: "all" | "admin_only") => void;
  onTheNosePoints: number;
  differencePoints: number;
  outcomePoints: number;
  tabSortOptions: Record<CreateTab, string>;
  groupCount: number;
}) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [activeTab, setActiveTab] = useState<CreateTab>("fixtures");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selectedGames, setSelectedGames] = useState<Set<string>>(new Set());
  const [selectedLeagues, setSelectedLeagues] = useState<Set<string>>(new Set());
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const groupNameInputRef = useRef<TextInput>(null);
  const descInputRef = useRef<TextInput>(null);
  const step1ScrollRef = useRef<ScrollView>(null);
  const prevStepRef = useRef(0);
  const router = useRouter();
  const createGroupMutation = useCreateGroupMutation();
  const [isCreating, setIsCreating] = useState(false);
  const [nudgeEnabled, setNudgeEnabled] = useState(true);
  const [draftPrivacy, setDraftPrivacy] = useState<"private" | "public">("private");
  const slideDirection = useRef<"forward" | "back">("forward");
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  React.useEffect(() => {
    const showSub = Keyboard.addListener("keyboardWillShow", (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener("keyboardWillHide", () => setKeyboardHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  React.useEffect(() => {
    if (step === 1 && prevStepRef.current === 0) {
      setGroupName(`My Group #${groupCount + 1}`);
      setGroupDescription("Predict match scores and compete with friends");
    }
    if (step === 1) {
      const id = setTimeout(() => groupNameInputRef.current?.focus(), 400);
      return () => clearTimeout(id);
    }
    if (step === 0) {
      setGroupName("");
      setGroupDescription("");
    }
    prevStepRef.current = step;
  }, [step, groupCount]);
  // Per-tab view mode — persisted per tab
  const VIEW_MODE_KEY = "create_tab_view_mode";
  const [tabViewMode, setTabViewMode] = useState<Record<CreateTab, "list" | "grid">>({
    fixtures: "grid",
    leagues: "grid",
    teams: "grid",
  });

  useEffect(() => {
    AsyncStorage.getItem(VIEW_MODE_KEY).then((val) => {
      if (val) {
        try {
          const parsed = JSON.parse(val);
          setTabViewMode((prev) => ({ ...prev, ...parsed }));
        } catch {}
      }
    });
  }, []);

  const setTabViewModeAndPersist = useCallback((updater: (prev: Record<CreateTab, "list" | "grid">) => Record<CreateTab, "list" | "grid">) => {
    setTabViewMode((prev) => {
      const next = updater(prev);
      AsyncStorage.setItem(VIEW_MODE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);
  const scrollRef = useRef<ScrollView>(null);

  const viewMode = tabViewMode[activeTab];
  const currentSortOption = tabSortOptions[activeTab];

  // Selection count based on active tab
  const selectionCount =
    activeTab === "fixtures"
      ? selectedGames.size
      : activeTab === "leagues"
        ? selectedLeagues.size
        : selectedTeams.size;
  const hasSelection = selectionCount > 0;

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    slideDirection.current = "forward";
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    slideDirection.current = "back";
    setStep((s) => Math.max(0, s - 1));
  };

  const handleCreateAndPublish = async () => {
    if (isCreating || groupName.trim().length === 0) return;
    setIsCreating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Build create body based on active tab selection
    const selectionMode: "games" | "leagues" | "teams" =
      activeTab === "fixtures" ? "games" : activeTab === "leagues" ? "leagues" : "teams";

    const createBody: Parameters<typeof createGroupMutation.mutateAsync>[0] = {
      name: groupName.trim(),
      privacy: "private",
      selectionMode,
      ...(activeTab === "fixtures" && {
        fixtureIds: Array.from(selectedGames).map(Number),
      }),
      ...(activeTab === "leagues" && {
        leagueIds: Array.from(selectedLeagues).map(Number),
      }),
      ...(activeTab === "teams" && {
        teamIds: Array.from(selectedTeams).map(Number),
      }),
    };

    try {
      const result = await createGroupMutation.mutateAsync(createBody);
      const groupId = result.data.id;

      // Publish with defaults
      await publishGroup(groupId, {
        name: groupName.trim(),
        privacy: draftPrivacy,
        inviteAccess,
        avatarType: "gradient",
        avatarValue,
        onTheNosePoints,
        correctDifferencePoints: differencePoints,
        outcomePoints,
        predictionMode: "CorrectScore",
        koRoundMode: "FullTime",
        maxMembers: 50,
        nudgeEnabled,
        nudgeWindowMinutes,
      });

      // Close sheet & navigate to group
      sheetRef.current?.dismiss();
      setStep(0);
      setSelectedGames(new Set());
      setSelectedLeagues(new Set());
      setSelectedTeams(new Set());
      setGroupName("");
      setGroupDescription("");
      router.push(`/groups/${groupId}` as any);
    } catch {
      // stay on screen so user can retry
    } finally {
      setIsCreating(false);
    }
  };

  const toggleGame = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedGames((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleLeague = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedLeagues((prev) => {
      if (prev.has(key)) return new Set();
      return new Set([key]);
    });
  };

  const toggleTeam = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTeams((prev) => {
      if (prev.has(key)) return new Set();
      return new Set([key]);
    });
  };

  const dates = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return Array.from({ length: 14 }, (_, i) => addDays(start, i));
  }, []);

  // ── Real data hooks ──
  const fixturesQuery = useUpcomingFixturesQuery({
    from: startOfDay(selectedDate).toISOString(),
    to: endOfDay(selectedDate).toISOString(),
    include: "league,teams,country",
  });

  const leaguesQuery = useLeaguesQuery({
    preset: searchQuery.length >= 2 ? undefined : "popular",
    search: searchQuery.length >= 2 ? searchQuery : undefined,
    includeCountry: true,
  });

  const teamsQuery = useTeamsQuery({
    preset: searchQuery.length >= 2 ? undefined : "popular",
    search: searchQuery.length >= 2 ? searchQuery : undefined,
    includeCountry: true,
  });

  const fixtures = useMemo(() => fixturesQuery.data?.data ?? [], [fixturesQuery.data]);
  const leagues = useMemo(() => leaguesQuery.data?.data ?? [], [leaguesQuery.data]);
  const teams = useMemo(() => teamsQuery.data?.data ?? [], [teamsQuery.data]);

  // Preview query — server resolves fixtures for any selection mode
  const previewBody = useMemo(() => ({
    selectionMode: (activeTab === "fixtures" ? "games" : activeTab) as "games" | "leagues" | "teams",
    ...(activeTab === "fixtures" && { fixtureIds: Array.from(selectedGames).map(Number) }),
    ...(activeTab === "leagues" && { leagueIds: Array.from(selectedLeagues).map(Number) }),
    ...(activeTab === "teams" && { teamIds: Array.from(selectedTeams).map(Number) }),
  }), [activeTab, selectedGames, selectedLeagues, selectedTeams]);
  const { data: preview } = useGroupPreviewQuery(previewBody);

  const durationLabel = useMemo(() => {
    if (!preview?.data?.startDate || !preview?.data?.endDate) return t("lobby.addGamesToSeeDuration");
    const start = format(new Date(preview.data.startDate), "dd/MM");
    const end = format(new Date(preview.data.endDate), "dd/MM");
    if (start === end) return start;
    const days = Math.ceil((new Date(preview.data.endDate).getTime() - new Date(preview.data.startDate).getTime()) / 86400000);
    return `${start} – ${end}${days > 0 ? ` · ${days}d` : ""}`;
  }, [preview, t]);

  // Selection summary for "view all" row
  const selectionSummary = useMemo(() => {
    if (activeTab === "fixtures") return `${selectedGames.size} ${selectedGames.size === 1 ? "game" : "games"}`;
    if (activeTab === "leagues") return `${selectedLeagues.size} ${selectedLeagues.size === 1 ? "league" : "leagues"}`;
    return `${selectedTeams.size} ${selectedTeams.size === 1 ? "team" : "teams"}`;
  }, [activeTab, selectedGames.size, selectedLeagues.size, selectedTeams.size]);

  // Skeleton pulse
  const skelOpacity = useSharedValue(0.4);
  React.useEffect(() => {
    skelOpacity.value = withRepeat(withTiming(1, { duration: 700 }), -1, true);
  }, [skelOpacity]);
  const skelPulse = useAnimatedStyle(() => ({ opacity: skelOpacity.value }));
  const skelColor = theme.colors.border;

  const renderListSkeleton = () => (
    <Animated.View style={skelPulse}>
      {Array.from({ length: 6 }, (_, i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 }}>
          <View style={{ width: 32, height: 32, borderRadius: 4, backgroundColor: skelColor }} />
          <View style={{ flex: 1, gap: 6 }}>
            <View style={{ width: "60%", height: 14, borderRadius: 6, backgroundColor: skelColor }} />
            <View style={{ width: "35%", height: 10, borderRadius: 4, backgroundColor: skelColor }} />
          </View>
          <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: skelColor }} />
        </View>
      ))}
    </Animated.View>
  );

  const renderGridSkeleton = () => (
    <Animated.View style={[skelPulse, { flexDirection: "row", flexWrap: "wrap", gap: 10 }]}>
      {Array.from({ length: 6 }, (_, i) => (
        <View key={i} style={{ width: "48%", padding: 12, borderRadius: 10, backgroundColor: skelColor + "30", gap: 8 }}>
          <View style={{ width: 36, height: 36, borderRadius: 4, backgroundColor: skelColor }} />
          <View style={{ width: "70%", height: 12, borderRadius: 5, backgroundColor: skelColor }} />
          <View style={{ width: "45%", height: 10, borderRadius: 4, backgroundColor: skelColor }} />
        </View>
      ))}
    </Animated.View>
  );

  const renderFixtureListSkeleton = () => (
    <Animated.View style={skelPulse}>
      {Array.from({ length: 5 }, (_, i) => (
        <View key={i} style={{ marginBottom: 10, gap: 4 }}>
          <View style={{ width: "45%", height: 10, borderRadius: 4, backgroundColor: skelColor, marginBottom: 4 }} />
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ flex: 1, gap: 5 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: skelColor }} />
                <View style={{ width: "50%", height: 13, borderRadius: 5, backgroundColor: skelColor }} />
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: skelColor }} />
                <View style={{ width: "45%", height: 13, borderRadius: 5, backgroundColor: skelColor }} />
              </View>
            </View>
            <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: skelColor }} />
          </View>
        </View>
      ))}
    </Animated.View>
  );

  const renderFixtureGridSkeleton = () => (
    <Animated.View style={[skelPulse, { flexDirection: "row", flexWrap: "wrap", gap: 10 }]}>
      {Array.from({ length: 6 }, (_, i) => (
        <View key={i} style={{ width: "48%", padding: 10, borderRadius: 10, backgroundColor: skelColor + "30", gap: 6 }}>
          <View style={{ width: 28, height: 9, borderRadius: 3, backgroundColor: skelColor }} />
          <View style={{ width: "50%", height: 9, borderRadius: 3, backgroundColor: skelColor }} />
          <View style={{ gap: 4, marginTop: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <View style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: skelColor }} />
              <View style={{ width: "55%", height: 11, borderRadius: 4, backgroundColor: skelColor }} />
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <View style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: skelColor }} />
              <View style={{ width: "50%", height: 11, borderRadius: 4, backgroundColor: skelColor }} />
            </View>
          </View>
        </View>
      ))}
    </Animated.View>
  );

  // Fixtures sorted by kickoff time
  const fixturesByTime = useMemo(
    () => [...fixtures].sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt)),
    [fixtures],
  );

  // Fixtures grouped by league
  const fixturesByLeague = useMemo(() => {
    const groups = new Map<number, { league: { id: number; name: string; imagePath: string | null }; fixtures: typeof fixtures }>();
    for (const f of fixtures) {
      if (!f.league) continue;
      const existing = groups.get(f.league.id);
      if (existing) {
        existing.fixtures.push(f);
      } else {
        groups.set(f.league.id, { league: f.league, fixtures: [f] });
      }
    }
    for (const group of groups.values()) {
      group.fixtures.sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt));
    }
    return Array.from(groups.values());
  }, [fixtures]);

  const handleTabPress = (tab: CreateTab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
    setSearchQuery("");
  };

  const handleDatePress = (date: Date) => {
    if (!isSameDay(date, selectedDate)) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedDate(date);
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      topInset={topInset}
      snapPoints={["100%"]}
      enableDynamicSizing={false}
      enablePanDownToClose
      backdropComponent={backdropComponent}
      backgroundStyle={{
        backgroundColor: theme.colors.background,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
      }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary }}
      handleStyle={{ paddingVertical: 6 }}
    >
      <View style={createStyles.container}>
        {/* Header */}
        <View
          style={[
            createStyles.header,
            { borderBottomColor: theme.colors.border },
          ]}
        >
          <View style={createStyles.headerCenter}>
            <AppText variant="subtitle" style={createStyles.headerTitle}>
              {t("groupCreation.createGroup")}
            </AppText>
            <AppText variant="caption" color="secondary" style={createStyles.headerDesc}>
              {step === 0
                ? activeTab === "fixtures"
                  ? "Select the games you want to predict"
                  : activeTab === "leagues"
                    ? "Choose leagues to include all their games"
                    : "Pick teams to follow their matches"
                : step === 1
                  ? t("groupCreation.step1Desc")
                  : t("groupCreation.step2Desc")}
            </AppText>
          </View>
          {step !== 0 && (
            <Pressable
              onPress={handleBack}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 6, position: "absolute", left: 12, top: 10 })}
            >
              <Ionicons name="arrow-back-circle-outline" size={24} color={theme.colors.textSecondary} />
            </Pressable>
          )}
          {step === 1 && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                slideDirection.current = "forward";
                setStep(2);
              }}
              style={({ pressed }) => ({
                opacity: pressed ? 0.6 : 1,
                paddingVertical: 5,
                paddingHorizontal: 12,
                borderRadius: 14,
                backgroundColor: theme.colors.textPrimary + "0A",
                position: "absolute",
                right: 12,
                top: 10,
              })}
            >
              <AppText variant="caption" style={{ color: theme.colors.primary, fontWeight: "600" }}>
                {t("groupCreation.advanced")}
              </AppText>
            </Pressable>
          )}
        </View>

        {/* Step 0: Selection UI */}
        {/* Date slider — fixtures only */}
        {step === 0 && activeTab === "fixtures" && (
          <View style={[createStyles.dateSliderWrap, { backgroundColor: theme.colors.background, shadowColor: theme.colors.background }]}>
            <ScrollView
              ref={scrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={createStyles.dateRow}
            >
              {dates.map((date) => {
                const isSelected = isSameDay(date, selectedDate);
                const label = isToday(date)
                  ? t("dates.today")
                  : `${format(date, "EEE")} ${format(date, "d/M")}`;

                return (
                  <Pressable
                    key={date.toISOString()}
                    onPress={() => handleDatePress(date)}
                    style={[
                      createStyles.dateItem,
                      {
                        backgroundColor: isSelected
                          ? theme.colors.primary + "14"
                          : theme.colors.textSecondary + "15",
                        borderColor: isSelected
                          ? theme.colors.primary + "30"
                          : theme.colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        createStyles.dateText,
                        {
                          color: isSelected
                            ? theme.colors.primary
                            : theme.colors.textSecondary,
                        },
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Search bar — leagues & teams */}
        {step === 0 && (activeTab === "leagues" || activeTab === "teams") && (
          <View style={[createStyles.dateSliderWrap, { backgroundColor: theme.colors.background, shadowColor: theme.colors.background }]}>
            <View style={createStyles.searchRow}>
              <Ionicons name="search" size={16} color={theme.colors.textSecondary} />
              <TextInput
                style={[createStyles.searchInput, { color: theme.colors.textPrimary }]}
                placeholder={activeTab === "leagues" ? t("groupCreation.searchLeaguesPlaceholder") : t("groupCreation.searchTeamsPlaceholder")}
                placeholderTextColor={theme.colors.textSecondary + "80"}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <Pressable
                  onPress={() => setSearchQuery("")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* Content area */}
        {step === 0 && (
        <View style={{ flex: 1 }}>
        <ScrollView style={createStyles.content} contentContainerStyle={createStyles.contentInner}>
          {/* Sort row — scrolls with content */}
          <View style={[createStyles.sortRow, { borderBottomColor: theme.colors.border }]}>
            <Pressable
              onPress={() => onOpenSort(activeTab)}
              style={({ pressed }) => [
                createStyles.sortBtn,
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Ionicons name="swap-vertical" size={13} color={theme.colors.textSecondary} />
              <Text style={[createStyles.sortLabel, { color: theme.colors.textSecondary }]}>
                {currentSortOption === "time" ? t("groupCreation.sortByTime") : t("groupCreation.sortByLeague")}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setTabViewModeAndPersist((prev) => ({ ...prev, [activeTab]: prev[activeTab] === "list" ? "grid" : "list" }));
              }}
              style={({ pressed }) => [
                createStyles.viewModeBtn,
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Ionicons name={viewMode === "list" ? "grid-outline" : "list"} size={14} color={theme.colors.textSecondary} />
            </Pressable>
          </View>

          {activeTab === "fixtures" && (() => {
            if (fixturesQuery.isFetching) {
              return viewMode === "grid" ? renderFixtureGridSkeleton() : renderFixtureListSkeleton();
            }

            if (fixtures.length === 0) {
              return (
                <View style={createStyles.loadingWrap}>
                  <Text style={[createStyles.emptyText, { color: theme.colors.textSecondary }]}>
                    {t("groupCreation.noGamesFound")}
                  </Text>
                </View>
              );
            }

            type FixtureRow = (typeof fixtures)[0];
            const fmtTime = (f: FixtureRow) => format(new Date(f.kickoffAt), "HH:mm");
            const roundLbl = (f: FixtureRow) => f.round ? `R${f.round.replace(/^Round\s*/i, "")}` : "";

            // Grid card renderer
            const renderGridCard = (f: FixtureRow, footerText: string) => {
              const gameKey = String(f.id);
              const isSelected = selectedGames.has(gameKey);
              return (
                <Pressable
                  key={gameKey}
                  onPress={() => toggleGame(gameKey)}
                  style={[
                    createStyles.gameGridCard,
                    { backgroundColor: theme.colors.textSecondary + "10" },
                  ]}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[createStyles.gameGridTime, { color: theme.colors.textSecondary }]}>{fmtTime(f)}</Text>
                      {footerText ? <Text style={[createStyles.gameGridMeta, { color: theme.colors.textSecondary }]} numberOfLines={1}>{footerText}</Text> : null}
                    </View>
                    <View
                      style={[
                        createStyles.gameGridAddBtn,
                        {
                          borderColor: isSelected ? theme.colors.primary : theme.colors.textSecondary + "60",
                          backgroundColor: isSelected ? theme.colors.primary : "transparent",
                        },
                      ]}
                    >
                      <Ionicons
                        name={isSelected ? "checkmark" : "add"}
                        size={14}
                        color={isSelected ? "#fff" : theme.colors.textSecondary}
                      />
                    </View>
                  </View>
                  <View style={createStyles.gameGridTeams}>
                    <View style={createStyles.gameGridTeamRow}>
                      <TeamLogo imagePath={f.homeTeam?.imagePath} teamName={f.homeTeam?.name ?? "?"} size={20} />
                      <Text style={[createStyles.gameGridTeamName, { color: theme.colors.textPrimary }]} numberOfLines={1}>{f.homeTeam?.name ?? "TBD"}</Text>
                    </View>
                    <View style={createStyles.gameGridTeamRow}>
                      <TeamLogo imagePath={f.awayTeam?.imagePath} teamName={f.awayTeam?.name ?? "?"} size={20} />
                      <Text style={[createStyles.gameGridTeamName, { color: theme.colors.textPrimary }]} numberOfLines={1}>{f.awayTeam?.name ?? "TBD"}</Text>
                    </View>
                  </View>
                </Pressable>
              );
            };

            // --- GRID VIEW ---
            if (viewMode === "grid") {
              if (currentSortOption === "time") {
                return (
                  <View style={createStyles.gameGrid}>
                    {fixturesByTime.map((f) =>
                      renderGridCard(f, f.league?.name ?? "")
                    )}
                  </View>
                );
              }
              // Grouped by league
              return (
                <>
                  {fixturesByLeague.map((section) => (
                    <View key={section.league.id} style={createStyles.leagueSection}>
                      <Text style={[createStyles.leagueHeader, { color: theme.colors.textPrimary }]}>
                        {section.league.name}
                      </Text>
                      <View style={createStyles.gameGrid}>
                        {section.fixtures.map((f) =>
                          renderGridCard(f, "")
                        )}
                      </View>
                    </View>
                  ))}
                </>
              );
            }

            // --- LIST VIEW ---
            const renderGameRow = (f: FixtureRow, footer: string) => {
              const gameKey = String(f.id);
              const isSelected = selectedGames.has(gameKey);
              return (
                <Pressable
                  key={gameKey}
                  onPress={() => toggleGame(gameKey)}
                  style={createStyles.gameCard}
                >
                  {footer ? <Text style={[createStyles.gameFooterText, { color: theme.colors.textSecondary, marginBottom: 4 }]}>{footer}</Text> : null}
                  <View style={createStyles.gameBody}>
                    <View style={createStyles.gameTeams}>
                      <View style={createStyles.gameTeamRow}>
                        <TeamLogo imagePath={f.homeTeam?.imagePath} teamName={f.homeTeam?.name ?? "?"} size={20} />
                        <Text style={[createStyles.gameTeamName, { color: theme.colors.textPrimary }]} numberOfLines={1}>{f.homeTeam?.name ?? "TBD"}</Text>
                      </View>
                      <View style={createStyles.gameTeamRow}>
                        <TeamLogo imagePath={f.awayTeam?.imagePath} teamName={f.awayTeam?.name ?? "?"} size={20} />
                        <Text style={[createStyles.gameTeamName, { color: theme.colors.textPrimary }]} numberOfLines={1}>{f.awayTeam?.name ?? "TBD"}</Text>
                      </View>
                    </View>
                    <View
                      style={[
                        createStyles.gameAddBtn,
                        {
                          borderColor: isSelected ? theme.colors.primary : theme.colors.textSecondary + "60",
                          backgroundColor: isSelected ? theme.colors.primary : "transparent",
                        },
                      ]}
                    >
                      <Ionicons
                        name={isSelected ? "checkmark" : "add"}
                        size={14}
                        color={isSelected ? "#fff" : theme.colors.textSecondary}
                      />
                    </View>
                  </View>
                </Pressable>
              );
            };

            if (currentSortOption === "time") {
              return (
                <>
                  {fixturesByTime.map((f) =>
                    renderGameRow(f, `${f.league?.name ?? ""} · ${fmtTime(f)}`)
                  )}
                </>
              );
            }

            // Grouped by league
            return (
              <>
              {fixturesByLeague.map((section) => (
                <View key={section.league.id} style={createStyles.leagueSection}>
                  <Text style={[createStyles.leagueHeader, { color: theme.colors.textPrimary }]}>
                    {section.league.name}
                  </Text>
                  {section.fixtures.map((f) =>
                    renderGameRow(f, fmtTime(f))
                  )}
                </View>
              ))}
              </>
            );
          })()}
          {activeTab === "leagues" && (() => {
            if (leaguesQuery.isFetching) {
              return viewMode === "grid" ? renderGridSkeleton() : renderListSkeleton();
            }

            if (leagues.length === 0) {
              return (
                <View style={createStyles.loadingWrap}>
                  <Text style={[createStyles.emptyText, { color: theme.colors.textSecondary }]}>
                    {t("groupCreation.noLeaguesFound")}
                  </Text>
                </View>
              );
            }

            if (viewMode === "list") {
              return (
                <>
                {leagues.map((league) => {
                  const key = String(league.id);
                  const isSelected = selectedLeagues.has(key);
                  return (
                    <Pressable
                      key={key}
                      onPress={() => toggleLeague(key)}
                      style={({ pressed }) => [
                        createStyles.listRow,
                        { opacity: pressed ? 0.7 : 1 },
                      ]}
                    >
                      <TeamLogo imagePath={league.imagePath} teamName={league.name} size={32} />
                      <View style={createStyles.listRowInfo}>
                        <Text style={[createStyles.listRowName, { color: theme.colors.textPrimary }]} numberOfLines={1}>{league.name}</Text>
                        <Text style={[createStyles.listRowSub, { color: theme.colors.textSecondary }]}>{league.country?.name ?? ""}</Text>
                      </View>
                      <View
                        style={[
                          createStyles.gameAddBtn,
                          {
                            borderColor: isSelected ? theme.colors.primary : theme.colors.textSecondary + "60",
                            backgroundColor: isSelected ? theme.colors.primary : "transparent",
                          },
                        ]}
                      >
                        <Ionicons name={isSelected ? "checkmark" : "add"} size={18} color={isSelected ? "#fff" : theme.colors.textSecondary} />
                      </View>
                    </Pressable>
                  );
                })}
                </>
              );
            }

            return (
              <View style={createStyles.leagueGrid}>
                {leagues.map((league) => {
                  const key = String(league.id);
                  const isSelected = selectedLeagues.has(key);
                  return (
                    <Pressable
                      key={key}
                      onPress={() => toggleLeague(key)}
                      style={({ pressed }) => [
                        createStyles.leagueGridItem,
                        {
                          backgroundColor: theme.colors.textSecondary + "10",
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <TeamLogo imagePath={league.imagePath} teamName={league.name} size={36} />
                      <Text style={[createStyles.leagueGridName, { color: theme.colors.textPrimary }]} numberOfLines={1}>{league.name}</Text>
                      <Text style={[createStyles.leagueGridCountry, { color: theme.colors.textSecondary }]}>{league.country?.name ?? ""}</Text>
                      <View
                        style={[
                          createStyles.leagueGridAddBtn,
                          {
                            borderColor: isSelected ? theme.colors.primary : theme.colors.textSecondary + "60",
                            backgroundColor: isSelected ? theme.colors.primary : "transparent",
                          },
                        ]}
                      >
                        <Ionicons name={isSelected ? "checkmark" : "add"} size={14} color={isSelected ? "#fff" : theme.colors.textSecondary} />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            );
          })()}
          {activeTab === "teams" && (() => {
            if (teamsQuery.isFetching) {
              return viewMode === "grid" ? renderGridSkeleton() : renderListSkeleton();
            }

            if (teams.length === 0) {
              return (
                <View style={createStyles.loadingWrap}>
                  <Text style={[createStyles.emptyText, { color: theme.colors.textSecondary }]}>
                    {t("groupCreation.noTeamsFound")}
                  </Text>
                </View>
              );
            }

            if (viewMode === "list") {
              return (
                <>
                {teams.map((team) => {
                  const key = String(team.id);
                  const isSelected = selectedTeams.has(key);
                  return (
                    <Pressable
                      key={key}
                      onPress={() => toggleTeam(key)}
                      style={({ pressed }) => [
                        createStyles.listRow,
                        { opacity: pressed ? 0.7 : 1 },
                      ]}
                    >
                      <TeamLogo imagePath={team.imagePath} teamName={team.name} size={32} />
                      <View style={createStyles.listRowInfo}>
                        <Text style={[createStyles.listRowName, { color: theme.colors.textPrimary }]} numberOfLines={1}>{team.name}</Text>
                        <Text style={[createStyles.listRowSub, { color: theme.colors.textSecondary }]}>{team.country?.name ?? ""}</Text>
                      </View>
                      <View
                        style={[
                          createStyles.gameAddBtn,
                          {
                            borderColor: isSelected ? theme.colors.primary : theme.colors.textSecondary + "60",
                            backgroundColor: isSelected ? theme.colors.primary : "transparent",
                          },
                        ]}
                      >
                        <Ionicons name={isSelected ? "checkmark" : "add"} size={18} color={isSelected ? "#fff" : theme.colors.textSecondary} />
                      </View>
                    </Pressable>
                  );
                })}
                </>
              );
            }

            return (
              <View style={createStyles.leagueGrid}>
                {teams.map((team) => {
                  const key = String(team.id);
                  const isSelected = selectedTeams.has(key);
                  return (
                    <Pressable
                      key={key}
                      onPress={() => toggleTeam(key)}
                      style={({ pressed }) => [
                        createStyles.leagueGridItem,
                        {
                          backgroundColor: theme.colors.textSecondary + "10",
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <TeamLogo imagePath={team.imagePath} teamName={team.name} size={36} />
                      <Text style={[createStyles.leagueGridName, { color: theme.colors.textPrimary }]} numberOfLines={1}>{team.name}</Text>
                      <Text style={[createStyles.leagueGridCountry, { color: theme.colors.textSecondary }]}>{team.country?.name ?? ""}</Text>
                      <View
                        style={[
                          createStyles.leagueGridAddBtn,
                          {
                            borderColor: isSelected ? theme.colors.primary : theme.colors.textSecondary + "60",
                            backgroundColor: isSelected ? theme.colors.primary : "transparent",
                          },
                        ]}
                      >
                        <Ionicons name={isSelected ? "checkmark" : "add"} size={14} color={isSelected ? "#fff" : theme.colors.textSecondary} />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            );
          })()}
        </ScrollView>
        </View>
        )}
        {step === 1 && (
          <View style={{ flex: 1 }}>
          {/* Step 1: Group Details */}
          <ScrollView ref={step1ScrollRef} style={{ flex: 1 }} contentContainerStyle={[createStyles.wizardContent, { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 100 : 20 }]} keyboardShouldPersistTaps="handled">
            <Pressable onPress={onOpenAvatarPicker} style={createStyles.avatarPicker}>
              <GroupAvatar
                avatarType="gradient"
                avatarValue={avatarValue}
                initials={groupName.trim() ? groupName.trim().substring(0, 2) : "Gr"}
                size={96}
                borderRadius={26}
                flat
              />
              <View style={[createStyles.avatarEditBadge, { backgroundColor: theme.colors.background }]}>
                <Ionicons name="color-palette-outline" size={14} color={theme.colors.textSecondary} />
              </View>
            </Pressable>
            <View style={createStyles.fieldGroup}>
              <TextInput
                style={[
                  createStyles.fieldInput,
                  {
                    color: theme.colors.textPrimary,
                    backgroundColor: theme.colors.textPrimary + "08",
                  },
                ]}
                placeholder={t("groupCreation.groupNamePlaceholder")}
                placeholderTextColor={theme.colors.textSecondary + "60"}
                value={groupName}
                onChangeText={setGroupName}
                ref={groupNameInputRef}
                maxLength={40}
                selectTextOnFocus
                onFocus={() => {
                  setTimeout(() => {
                    step1ScrollRef.current?.scrollTo({ y: 0, animated: true });
                  }, 300);
                }}
              />
              <TextInput
                style={[
                  createStyles.descInput,
                  { color: theme.colors.textPrimary, backgroundColor: theme.colors.textPrimary + "08" },
                ]}
                placeholder={t("lobby.descriptionPlaceholder")}
                placeholderTextColor={theme.colors.textSecondary + "50"}
                value={groupDescription}
                onChangeText={setGroupDescription}
                ref={descInputRef}
                maxLength={200}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                onFocus={() => {
                  setTimeout(() => {
                    step1ScrollRef.current?.scrollToEnd({ animated: true });
                  }, 300);
                }}
              />
            </View>
          </ScrollView>

          {/* Sticky create button */}
          <View style={[createStyles.stickyBottom, { bottom: keyboardHeight > 0 ? keyboardHeight : insets.bottom + 16, paddingHorizontal: 16, ...(keyboardHeight > 0 && { backgroundColor: theme.colors.background, shadowColor: theme.colors.background, shadowOffset: { width: 0, height: -30 }, shadowOpacity: 1, shadowRadius: 15, elevation: 8 }) }]}>
            <Pressable
              onPress={handleCreateAndPublish}
              disabled={isCreating || groupName.trim().length === 0}
              style={({ pressed }) => [
                createStyles.continueBottomBtn,
                {
                  borderColor: groupName.trim().length > 0 && !isCreating
                    ? theme.colors.primary + "40"
                    : theme.colors.textSecondary + "20",
                  marginBottom: 0,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <>
                  <AppText variant="caption" style={{ color: groupName.trim().length > 0 ? theme.colors.primary : theme.colors.textSecondary + "60", fontWeight: "600", fontSize: 13 }}>
                    {t("groupCreation.createGroup")}
                  </AppText>
                  <Ionicons name="arrow-forward" size={14} color={groupName.trim().length > 0 ? theme.colors.primary : theme.colors.textSecondary + "60"} />
                </>
              )}
            </Pressable>
          </View>
          </View>
        )}
        {step === 2 && (
          <View style={{ flex: 1 }}>
          {/* Step 2: Advanced */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={createStyles.advancedContent}>
            {/* Info */}
            <Text style={[createStyles.advSectionTitle, { color: theme.colors.textSecondary }]}>
              {t("lobby.info")}
            </Text>
            <View style={createStyles.advRow}>
              <Text style={[createStyles.advRowLabel, { color: theme.colors.textPrimary }]}>{t("lobby.groupDuration")}</Text>
              <Text style={[createStyles.advRowValue, { color: theme.colors.textSecondary }]}>
                {durationLabel}
              </Text>
            </View>
            <View style={createStyles.advRow}>
              <Text style={[createStyles.advRowLabel, { color: theme.colors.textPrimary }]}>{t("lobby.games")}</Text>
              <Text style={[createStyles.advRowValue, { color: theme.colors.textSecondary }]}>{preview?.data?.fixtureCount ?? 0} {(preview?.data?.fixtureCount ?? 0) === 1 ? "game" : "games"}</Text>
            </View>

            {/* Predictions */}
            <Text style={[createStyles.advSectionTitle, { color: theme.colors.textSecondary, marginTop: 8 }]}>
              {t("lobby.predictionRules")}
            </Text>
            <Pressable
              onPress={() => onOpenAdvSheet("prediction")}
              style={({ pressed }) => [createStyles.advRow, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={[createStyles.advRowLabel, { color: theme.colors.textPrimary }]}>{t("lobby.predictionMode")}</Text>
              <View style={createStyles.advRowRight}>
                <Text style={[createStyles.advRowValue, { color: theme.colors.textSecondary }]}>{t("lobby.exactResult")}</Text>
                <Ionicons name="chevron-forward" size={14} color={theme.colors.textSecondary + "60"} />
              </View>
            </Pressable>
            <Pressable
              onPress={() => onOpenAdvSheet("scoring")}
              style={({ pressed }) => [createStyles.advRow, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={[createStyles.advRowLabel, { color: theme.colors.textPrimary }]}>{t("lobby.scoring")}</Text>
              <View style={createStyles.advRowRight}>
                <Text style={[createStyles.advRowValue, { color: theme.colors.textSecondary }]}>{onTheNosePoints} · {differencePoints} · {outcomePoints}</Text>
                <Ionicons name="chevron-forward" size={14} color={theme.colors.textSecondary + "60"} />
              </View>
            </Pressable>
            <Pressable
              onPress={() => onOpenAdvSheet("ko")}
              style={({ pressed }) => [createStyles.advRow, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={[createStyles.advRowLabel, { color: theme.colors.textPrimary }]}>{t("lobby.koRoundMode")}</Text>
              <View style={createStyles.advRowRight}>
                <Text style={[createStyles.advRowValue, { color: theme.colors.textSecondary }]}>{t("lobby.90min")}</Text>
                <Ionicons name="chevron-forward" size={14} color={theme.colors.textSecondary + "60"} />
              </View>
            </Pressable>

            {/* Group */}
            <Text style={[createStyles.advSectionTitle, { color: theme.colors.textSecondary, marginTop: 8 }]}>
              {t("lobby.advanced")}
            </Text>
            <Pressable
              onPress={() => onOpenAdvSheet("members")}
              style={({ pressed }) => [createStyles.advRow, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={[createStyles.advRowLabel, { color: theme.colors.textPrimary }]}>{t("lobby.maxMembers")}</Text>
              <View style={createStyles.advRowRight}>
                <Text style={[createStyles.advRowValue, { color: theme.colors.textSecondary }]}>50</Text>
                <Ionicons name="chevron-forward" size={14} color={theme.colors.textSecondary + "60"} />
              </View>
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setNudgeEnabled((prev) => !prev);
              }}
              style={({ pressed }) => [createStyles.advRow, { opacity: pressed ? 0.6 : 1 }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[createStyles.advRowLabel, { color: theme.colors.textPrimary }]}>{t("lobby.nudge")}</Text>
                <Text style={[createStyles.advRowSub, { color: theme.colors.textSecondary }]}>{t("lobby.nudgeDescription")}</Text>
              </View>
              <View style={[createStyles.advToggle, { backgroundColor: nudgeEnabled ? theme.colors.primary : theme.colors.textSecondary + "30" }]}>
                <View style={[createStyles.advToggleKnob, { alignSelf: nudgeEnabled ? "flex-end" : "flex-start" }]} />
              </View>
            </Pressable>
            {nudgeEnabled && (
              <Pressable
                onPress={() => onOpenAdvSheet("nudgeWindow")}
                style={({ pressed }) => [createStyles.advRow, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Text style={[createStyles.advRowLabel, { color: theme.colors.textPrimary }]}>{t("lobby.minutesBeforeKickoff")}</Text>
                <View style={createStyles.advRowRight}>
                  <Text style={[createStyles.advRowValue, { color: theme.colors.textSecondary }]}>{nudgeWindowMinutes} min</Text>
                  <Ionicons name="chevron-forward" size={14} color={theme.colors.textSecondary + "60"} />
                </View>
              </Pressable>
            )}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setDraftPrivacy((prev) => prev === "private" ? "public" : "private");
              }}
              style={({ pressed }) => [createStyles.advRow, { opacity: pressed ? 0.6 : 1 }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[createStyles.advRowLabel, { color: theme.colors.textPrimary }]}>{t("lobby.private")}</Text>
                <Text style={[createStyles.advRowSub, { color: theme.colors.textSecondary }]}>{draftPrivacy === "private" ? t("lobby.privateDescription") : t("lobby.publicDescription")}</Text>
              </View>
              <View style={[createStyles.advToggle, { backgroundColor: draftPrivacy === "private" ? theme.colors.primary : theme.colors.textSecondary + "30" }]}>
                <View style={[createStyles.advToggleKnob, { alignSelf: draftPrivacy === "private" ? "flex-end" : "flex-start" }]} />
              </View>
            </Pressable>
            {draftPrivacy === "private" && (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onInviteAccessChange(inviteAccess === "all" ? "admin_only" : "all");
                }}
                style={({ pressed }) => [createStyles.advRow, { opacity: pressed ? 0.6 : 1 }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[createStyles.advRowLabel, { color: theme.colors.textPrimary }]}>{t("lobby.inviteSharing")}</Text>
                  <Text style={[createStyles.advRowSub, { color: theme.colors.textSecondary }]}>{inviteAccess === "all" ? t("lobby.allMembersCanShare") : t("lobby.onlyAdminsCanShare")}</Text>
                </View>
                <View style={[createStyles.advToggle, { backgroundColor: inviteAccess === "all" ? theme.colors.primary : theme.colors.textSecondary + "30" }]}>
                  <View style={[createStyles.advToggleKnob, { alignSelf: inviteAccess === "all" ? "flex-end" : "flex-start" }]} />
                </View>
              </Pressable>
            )}
          </ScrollView>
          </View>
        )}

        {/* Bottom: continue + tabs — only on step 0 */}
        {step === 0 && (
          <View
            style={[
              createStyles.tabBar,
              {
                backgroundColor: theme.colors.background,
                paddingBottom: Math.max(insets.bottom, 12),
                shadowColor: theme.colors.background,
                shadowOffset: { width: 0, height: -6 },
                shadowOpacity: 1,
                shadowRadius: 6,
                elevation: 10,
              },
            ]}
          >
            <Pressable
              onPress={handleContinue}
              disabled={!hasSelection}
              style={({ pressed }) => [
                createStyles.continueBottomBtn,
                {
                  borderColor: hasSelection ? theme.colors.primary + "40" : theme.colors.textSecondary + "20",
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <AppText variant="caption" style={{ color: hasSelection ? theme.colors.primary : theme.colors.textSecondary + "60", fontWeight: "600", fontSize: 13 }}>
                {hasSelection ? `${t("common.continue")} (${selectionCount})` : t("common.continue")}
              </AppText>
              <Ionicons name="arrow-forward" size={14} color={hasSelection ? theme.colors.primary : theme.colors.textSecondary + "60"} />
            </Pressable>
            <View style={createStyles.tabRow}>
              {CREATE_TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => handleTabPress(tab.key)}
                    style={({ pressed }) => [
                      createStyles.tab,
                      {
                        backgroundColor: theme.colors.textSecondary + "15",
                        transform: [{ scale: pressed ? 0.95 : 1 }],
                      },
                    ]}
                  >
                    <Ionicons
                      name={tab.icon}
                      size={24}
                      color={isActive ? theme.colors.primary : theme.colors.textSecondary}
                    />
                    <AppText
                      variant="caption"
                      style={[
                        createStyles.tabLabel,
                        { color: isActive ? theme.colors.primary : theme.colors.textSecondary },
                      ]}
                    >
                      {t(tab.labelKey)}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Creating overlay */}
        {isCreating && (
          <Animated.View
            entering={FadeIn.duration(300)}
            style={[createStyles.creatingOverlay, { backgroundColor: theme.colors.background + "E6", paddingBottom: keyboardHeight }]}
            pointerEvents="box-only"
          >
            <ActivityIndicator size="small" color={theme.colors.textSecondary} />
          </Animated.View>
        )}

      </View>

    </BottomSheetModal>
  );
}

const createStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  creatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "500",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerCenter: {
    flex: 1,
    marginRight: 12,
  },
  headerBackText: {
    padding: 4,
  },
  wizardContent: {
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  wizardTitle: {
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  avatarPicker: {
    alignSelf: "center",
    marginBottom: 20,
    position: "relative",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  fieldInput: {
    fontSize: 18,
    fontWeight: "500",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    textAlign: "left",
  },
  descInput: {
    fontSize: 14,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    minHeight: 100,
    textAlign: "left",
  },
  fieldCharCount: {
    fontSize: 11,
    fontWeight: "500",
    textAlign: "right",
  },
  stickyBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingVertical: 6,
    paddingHorizontal: 20,
  },
  createBtn: {
    borderRadius: 20,
    paddingVertical: 12,
    alignSelf: "stretch",
    alignItems: "center",
  },
  createBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  advancedContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  advSectionTitle: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },
  advRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  advRowLabel: {
    fontSize: 15,
  },
  advRowValue: {
    fontSize: 14,
  },
  advRowSub: {
    fontSize: 11,
    marginTop: 2,
  },
  advToggle: {
    width: 34,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  nudgeChipsContainer: {
    paddingVertical: 8,
    paddingLeft: 12,
  },
  nudgeChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  nudgeChip: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  advToggleKnob: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#fff",
    alignSelf: "flex-end",
  },
  advRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    paddingBottom: 12,
    marginBottom: 8,
    borderBottomWidth: 1,
  },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  sheetOptionLabel: {
    fontSize: 14,
  },
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
    paddingBottom: 20,
  },
  avatarGridItem: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
  },
  headerTitle: {
    fontWeight: "700",
    fontSize: 20,
    textAlign: "center",
  },
  headerDesc: {
    fontSize: 13,
    marginTop: 2,
    textAlign: "center",
  },
  continueBottomBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    flexShrink: 0,
  },
  continueBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
    flexShrink: 0,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 160,
  },
  leagueGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  leagueGridItem: {
    width: "48%",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 10,
    gap: 6,
  },
  leagueGridDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  leagueGridName: {
    fontSize: 12,
    fontWeight: "600",
  },
  leagueGridCountry: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: -2,
  },
  gameGridAddBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  leagueGridAddBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  leagueGridBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  leagueGridBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  listRowDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  listRowInfo: {
    flex: 1,
    gap: 1,
  },
  listRowName: {
    fontSize: 14,
    fontWeight: "600",
  },
  listRowSub: {
    fontSize: 11,
    fontWeight: "500",
  },
  gameGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  gameGridCard: {
    width: "48%",
    padding: 10,
    borderRadius: 10,
    gap: 6,
  },
  gameGridTeams: {
    gap: 3,
    marginTop: 4,
  },
  gameGridTeamRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    overflow: "hidden",
  },
  gameGridDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  gameGridTeamName: {
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
  },
  gameGridFooter: {
    gap: 3,
  },
  gameGridMeta: {
    fontSize: 10,
    fontWeight: "500",
  },
  gameGridTime: {
    fontSize: 10,
    fontWeight: "500",
  },
  leagueSection: {
    marginBottom: 6,
  },
  leagueHeader: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
  },
  gameCard: {
    marginBottom: 10,
  },
  gameBody: {
    flexDirection: "row",
    alignItems: "center",
  },
  gameTeams: {
    flex: 1,
    gap: 4,
  },
  gameTeamRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  gameTeamDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  gameTeamName: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  gameAddBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  gameFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
    paddingLeft: 28,
  },
  gameFooterText: {
    fontSize: 10,
    fontWeight: "500",
  },
  gameFooterDot: {
    fontSize: 10,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 12,
    marginVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.04)",
    height: 34,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  dateSliderWrap: {
    height: 46,
    zIndex: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 5,
  },
  dateRow: {
    paddingHorizontal: 12,
    alignItems: "center",
    paddingVertical: 10,
    gap: 6,
  },
  dateItem: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  dateText: {
    fontSize: 12,
    fontWeight: "600",
  },
  tabBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  tabRow: {
    flexDirection: "row",
    gap: 10,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
  },
  tabLabel: {
    fontWeight: "600",
    fontSize: 12,
  },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sortLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  viewModeBtn: {
    padding: 4,
  },
  sortSheet: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 34,
  },
  sortSheetTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 20,
  },
  sortSheetItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  sortSheetItemText: {
    fontSize: 17,
    fontWeight: "500",
  },
  sortSheetCancel: {
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 12,
  },
  sortSheetCancelText: {
    fontSize: 16,
    fontWeight: "500",
  },
});

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

  // Skeleton pulse animation
  const skeletonOpacity = useSharedValue(0.5);
  React.useEffect(() => {
    skeletonOpacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [skeletonOpacity]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: skeletonOpacity.value }));
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
    const refs = { prediction: advPredictionRef, scoring: advScoringRef, ko: advKoRef, members: advMembersRef, nudgeWindow: advNudgeWindowRef };
    refs[sheet].current?.present();
  }, []);

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
    const skeletonColor = theme.colors.border;
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
        <Screen
          scroll={false}
          contentContainerStyle={{
            alignItems: "stretch",
            flex: 1,
            padding: 0,
          }}
        >
          <Animated.View style={pulseStyle}>
          {/* Header skeleton */}
          <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
            <View style={styles.headerTop}>
              <View style={{ width: 100, height: 28, backgroundColor: skeletonColor, borderRadius: 8 }} />
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ width: 28, height: 28, backgroundColor: skeletonColor, borderRadius: 14 }} />
                <View style={{ width: 28, height: 28, backgroundColor: skeletonColor, borderRadius: 14 }} />
              </View>
            </View>
            {/* Search bar skeleton */}
            <View
              style={{
                height: 40,
                backgroundColor: skeletonColor,
                borderRadius: 10,
                marginTop: 10,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            />
          </View>

          {/* Filter tabs skeleton */}
          <View style={{
            flexDirection: "row",
            paddingHorizontal: 16,
            paddingVertical: 10,
            gap: 8,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
          }}>
            {[70, 85, 60, 55, 60].map((w, i) => (
              <View
                key={i}
                style={{
                  width: w,
                  height: 32,
                  backgroundColor: i === 0 ? theme.colors.primary + "20" : skeletonColor,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: i === 0 ? theme.colors.primary + "40" : theme.colors.border,
                }}
              />
            ))}
          </View>

          {/* Cards skeleton */}
          <View style={{ paddingTop: 12 }}>
            {[1, 2, 3].map((i) => (
              <View
                key={i}
                style={{
                  marginHorizontal: 16,
                  marginBottom: 12,
                  borderRadius: 14,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                <View
                  style={{
                    backgroundColor: theme.colors.cardBackground,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    paddingTop: 14,
                    paddingHorizontal: 14,
                    overflow: "hidden",
                  }}
                >
                  {/* Top row skeleton */}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                    {/* Avatar */}
                    <View
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 12,
                        backgroundColor: skeletonColor,
                      }}
                    />
                    {/* Info */}
                    <View style={{ flex: 1, gap: 8 }}>
                      <View style={{ width: "75%", height: 18, backgroundColor: skeletonColor, borderRadius: 6 }} />
                      <View
                        style={{
                          width: 100,
                          height: 24,
                          backgroundColor: skeletonColor,
                          borderRadius: 8,
                        }}
                      />
                    </View>
                    {/* Right badges */}
                    <View style={{ gap: 6, alignItems: "center" }}>
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: skeletonColor }} />
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: skeletonColor }} />
                    </View>
                  </View>

                  {/* Next game skeleton */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: 14,
                      marginHorizontal: -14,
                      paddingHorizontal: 14,
                      paddingTop: 14,
                      paddingBottom: 12,
                      borderTopWidth: 1,
                      borderTopColor: theme.colors.border,
                    }}
                  >
                    <View style={{ flex: 1, gap: 6 }}>
                      <View style={{ width: 100, height: 12, backgroundColor: skeletonColor, borderRadius: 4 }} />
                      <View style={{ width: 150, height: 16, backgroundColor: skeletonColor, borderRadius: 4 }} />
                    </View>
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      <View style={{ alignItems: "center", gap: 2 }}>
                        <View style={{ width: 20, height: 10, backgroundColor: skeletonColor, borderRadius: 3 }} />
                        <View
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 7,
                            backgroundColor: skeletonColor,
                            borderWidth: 1,
                            borderBottomWidth: CARD_BORDER_BOTTOM_WIDTH,
                            borderColor: theme.colors.border,
                          }}
                        />
                      </View>
                      <View style={{ alignItems: "center", gap: 2 }}>
                        <View style={{ width: 20, height: 10, backgroundColor: skeletonColor, borderRadius: 3 }} />
                        <View
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 7,
                            backgroundColor: skeletonColor,
                            borderWidth: 1,
                            borderBottomWidth: CARD_BORDER_BOTTOM_WIDTH,
                            borderColor: theme.colors.border,
                          }}
                        />
                      </View>
                    </View>
                  </View>

                  {/* Stats HUD skeleton */}
                  <View
                    style={{
                      flexDirection: "row",
                      paddingVertical: 12,
                      gap: 4,
                      borderTopWidth: 1,
                      borderTopColor: theme.colors.border,
                    }}
                  >
                    {[1, 2, 3].map((j) => (
                      <View
                        key={j}
                        style={{
                          flex: 1,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                          paddingVertical: 6,
                        }}
                      >
                        <View style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: skeletonColor }} />
                        <View style={{ width: 28, height: 14, borderRadius: 4, backgroundColor: skeletonColor }} />
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            ))}
          </View>
          </Animated.View>
        </Screen>
      </View>
    );
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
        nudgeWindowMinutes={createNudgeWindowMinutes}
        inviteAccess={createInviteAccess}
        onNudgeWindowChange={setCreateNudgeWindowMinutes}
        onInviteAccessChange={setCreateInviteAccess}
        onTheNosePoints={createOnTheNosePoints}
        differencePoints={createDifferencePoints}
        outcomePoints={createOutcomePoints}
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
          {[
            { value: "result", label: t("lobby.exactResult") },
            { value: "3way", label: t("lobby.matchWinner") },
          ].map((opt) => (
            <Pressable key={opt.value} style={({ pressed }) => [createStyles.sheetOption, { opacity: pressed ? 0.6 : 1 }]}>
              <Text style={[createStyles.sheetOptionLabel, { color: theme.colors.textPrimary }]}>{opt.label}</Text>
              <Ionicons name={opt.value === "result" ? "radio-button-on" : "radio-button-off"} size={18} color={opt.value === "result" ? theme.colors.primary : theme.colors.textSecondary} />
            </Pressable>
          ))}
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
        </BottomSheetView>
      </BottomSheetModal>

      <BottomSheetModal ref={advKoRef} stackBehavior="push" enableDynamicSizing enablePanDownToClose backdropComponent={renderCreateBackdrop} backgroundStyle={{ backgroundColor: theme.colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20 }} handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary }}>
        <BottomSheetView style={createStyles.sheetContent}>
          <Text style={[createStyles.sheetTitle, { color: theme.colors.textPrimary, borderBottomColor: theme.colors.textPrimary + "10" }]}>{t("lobby.koRoundMode")}</Text>
          {[
            { value: "90min", label: t("lobby.90min") },
            { value: "extraTime", label: t("lobby.extraTime") },
            { value: "penalties", label: t("lobby.penalties") },
          ].map((opt) => (
            <Pressable key={opt.value} style={({ pressed }) => [createStyles.sheetOption, { opacity: pressed ? 0.6 : 1 }]}>
              <Text style={[createStyles.sheetOptionLabel, { color: theme.colors.textPrimary }]}>{opt.label}</Text>
              <Ionicons name={opt.value === "90min" ? "radio-button-on" : "radio-button-off"} size={18} color={opt.value === "90min" ? theme.colors.primary : theme.colors.textSecondary} />
            </Pressable>
          ))}
        </BottomSheetView>
      </BottomSheetModal>

      <BottomSheetModal ref={advMembersRef} stackBehavior="push" enableDynamicSizing enablePanDownToClose backdropComponent={renderCreateBackdrop} backgroundStyle={{ backgroundColor: theme.colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20 }} handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary }}>
        <BottomSheetView style={createStyles.sheetContent}>
          <Text style={[createStyles.sheetTitle, { color: theme.colors.textPrimary, borderBottomColor: theme.colors.textPrimary + "10" }]}>{t("lobby.maxMembers")}</Text>
          {[10, 20, 30, 50, 100].map((num) => (
            <Pressable key={num} style={({ pressed }) => [createStyles.sheetOption, { opacity: pressed ? 0.6 : 1 }]}>
              <Text style={[createStyles.sheetOptionLabel, { color: theme.colors.textPrimary }]}>{num}</Text>
              <Ionicons name={num === 50 ? "radio-button-on" : "radio-button-off"} size={18} color={num === 50 ? theme.colors.primary : theme.colors.textSecondary} />
            </Pressable>
          ))}
        </BottomSheetView>
      </BottomSheetModal>

      {/* Nudge window sheet */}
      <BottomSheetModal ref={advNudgeWindowRef} stackBehavior="push" enableDynamicSizing enablePanDownToClose backdropComponent={renderCreateBackdrop} backgroundStyle={{ backgroundColor: theme.colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20 }} handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary }}>
        <BottomSheetView style={createStyles.sheetContent}>
          <Text style={[createStyles.sheetTitle, { color: theme.colors.textPrimary, borderBottomColor: theme.colors.textPrimary + "10" }]}>{t("lobby.minutesBeforeKickoff")}</Text>
          {[30, 60, 120, 180].map((min) => (
            <Pressable key={min} onPress={() => { setCreateNudgeWindowMinutes(min); advNudgeWindowRef.current?.dismiss(); }} style={({ pressed }) => [createStyles.sheetOption, { opacity: pressed ? 0.6 : 1 }]}>
              <Text style={[createStyles.sheetOptionLabel, { color: theme.colors.textPrimary }]}>{min} min</Text>
              <Ionicons name={min === createNudgeWindowMinutes ? "radio-button-on" : "radio-button-off"} size={18} color={min === createNudgeWindowMinutes ? theme.colors.primary : theme.colors.textSecondary} />
            </Pressable>
          ))}
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
