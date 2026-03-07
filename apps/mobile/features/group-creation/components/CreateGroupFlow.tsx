// features/group-creation/components/CreateGroupFlow.tsx
// Extracted from app/(tabs)/groups.tsx — the full create-group bottom sheet wizard.
// Contains: CreateGroupSheet component + createStyles StyleSheet.

import React, { useState, useCallback, useRef, useMemo, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  FadeIn,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetModal,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { AppText, TeamLogo, GroupAvatar } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useCreateGroupMutation, useGroupPreviewQuery } from "@/domains/groups";
import { publishGroup, updateGroup } from "@/domains/groups/groups-core.api";
import { addDays, format, isToday, isSameDay, startOfDay, endOfDay } from "date-fns";
import { useUpcomingFixturesQuery } from "@/domains/fixtures";
import { useLeaguesQuery } from "@/domains/leagues";
import { useTeamsQuery } from "@/domains/teams";

/* ─── Create Group Sheet ─── */

export type CreateTab = "fixtures" | "leagues" | "teams";

const CREATE_TABS: { key: CreateTab; labelKey: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "fixtures", labelKey: "groupCreation.freeSelection", icon: "grid-outline" },
  { key: "leagues", labelKey: "groupCreation.leagues", icon: "trophy-outline" },
  { key: "teams", labelKey: "groupCreation.teams", icon: "shirt-outline" },
];

export function CreateGroupSheet({
  sheetRef,
  topInset,
  backdropComponent,
  onOpenSort,
  onOpenAdvSheet,
  onOpenAvatarPicker,
  avatarValue,
  nudgeEnabled,
  nudgeWindowMinutes,
  inviteAccess,
  onNudgeWindowChange,
  onInviteAccessChange,
  onTheNosePoints,
  differencePoints,
  outcomePoints,
  predictionMode,
  koRoundMode,
  maxMembers,
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
  nudgeEnabled: boolean;
  nudgeWindowMinutes: number;
  inviteAccess: "all" | "admin_only";
  onNudgeWindowChange: (val: number) => void;
  onInviteAccessChange: (val: "all" | "admin_only") => void;
  onTheNosePoints: number;
  differencePoints: number;
  outcomePoints: number;
  predictionMode: "CorrectScore" | "ThreeWay";
  koRoundMode: "FullTime" | "ExtraTime" | "Penalties";
  maxMembers: number;
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
  const [draftPrivacy, setDraftPrivacy] = useState<"private" | "public">("private");
  const slideDirection = useRef<"forward" | "back">("forward");
  const step1Padding = useSharedValue(insets.bottom);

  React.useEffect(() => {
    const showSub = Keyboard.addListener("keyboardWillShow", (e) => {
      step1Padding.value = withTiming(e.endCoordinates.height - topInset, { duration: e.duration || 250 });
    });
    const hideSub = Keyboard.addListener("keyboardWillHide", (e) => {
      step1Padding.value = withTiming(insets.bottom, { duration: e.duration || 250 });
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, [step1Padding, topInset, insets.bottom]);

  const step1AnimStyle = useAnimatedStyle(() => ({
    flex: 1,
    paddingBottom: step1Padding.value,
  }));

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

      // Publish with settings
      await publishGroup(groupId, {
        name: groupName.trim(),
        description: groupDescription.trim() || undefined,
        privacy: draftPrivacy,
        inviteAccess,
        onTheNosePoints,
        correctDifferencePoints: differencePoints,
        outcomePoints,
        predictionMode,
        koRoundMode,
        maxMembers,
        nudgeEnabled,
        nudgeWindowMinutes,
      });

      // Set avatar via update
      await updateGroup(groupId, {
        avatarType: "gradient",
        avatarValue,
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
          <Animated.View style={step1AnimStyle}>
          {/* Step 1: Group Details */}
          <View style={{ flex: 1, paddingHorizontal: 20 }}>
            <View style={{ flex: 3 }} />
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
              />
            </View>
            {/* Create button */}
            <Pressable
              onPress={handleCreateAndPublish}
              disabled={isCreating || groupName.trim().length === 0}
              style={({ pressed }) => [
                createStyles.continueBottomBtn,
                {
                  borderColor: groupName.trim().length > 0 && !isCreating
                    ? theme.colors.primary + "40"
                    : theme.colors.textSecondary + "20",
                  marginTop: 24,
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
            <View style={{ flex: 5 }} />
          </View>
          </Animated.View>
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
                <Text style={[createStyles.advRowValue, { color: theme.colors.textSecondary }]}>{predictionMode === "CorrectScore" ? t("lobby.exactResult") : t("lobby.matchWinner")}</Text>
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
                <Text style={[createStyles.advRowValue, { color: theme.colors.textSecondary }]}>{koRoundMode === "FullTime" ? t("lobby.90min") : koRoundMode === "ExtraTime" ? t("lobby.extraTime") : t("lobby.penalties")}</Text>
                <Ionicons name="chevron-forward" size={14} color={theme.colors.textSecondary + "60"} />
              </View>
            </Pressable>

            {/* <Pressable
              onPress={() => onOpenAdvSheet("members")}
              style={({ pressed }) => [createStyles.advRow, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={[createStyles.advRowLabel, { color: theme.colors.textPrimary }]}>{t("lobby.maxMembers")}</Text>
              <View style={createStyles.advRowRight}>
                <Text style={[createStyles.advRowValue, { color: theme.colors.textSecondary }]}>{maxMembers}</Text>
                <Ionicons name="chevron-forward" size={14} color={theme.colors.textSecondary + "60"} />
              </View>
            </Pressable> */}
            <Text style={[createStyles.advSectionTitle, { color: theme.colors.textSecondary, marginTop: 8 }]}>
              {t("groupSettings.notifications")}
            </Text>
            <Pressable
              onPress={() => onOpenAdvSheet("nudgeWindow")}
              style={({ pressed }) => [createStyles.advRow, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={[createStyles.advRowLabel, { color: theme.colors.textPrimary }]}>{t("lobby.nudge")}</Text>
              <View style={createStyles.advRowRight}>
                <Text style={[createStyles.advRowValue, { color: theme.colors.textSecondary }]}>{nudgeEnabled ? `${nudgeWindowMinutes} min` : "Off"}</Text>
                <Ionicons name="chevron-forward" size={14} color={theme.colors.textSecondary + "60"} />
              </View>
            </Pressable>
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
          <View style={{ paddingHorizontal: 16, paddingVertical: 8, paddingBottom: Math.max(insets.bottom, 16) }}>
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
            style={[createStyles.creatingOverlay, { backgroundColor: theme.colors.background + "E6" }]}
            pointerEvents="box-only"
          >
            <ActivityIndicator size="small" color={theme.colors.textSecondary} />
          </Animated.View>
        )}

      </View>

    </BottomSheetModal>
  );
}

export const createStyles = StyleSheet.create({
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
  sheetDoneBtn: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  sheetDoneBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    textTransform: "capitalize",
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
