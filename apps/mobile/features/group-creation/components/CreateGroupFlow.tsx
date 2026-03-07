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
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useCreateGroupMutation, useGroupPreviewQuery } from "@/domains/groups";
import { publishGroup, updateGroup } from "@/domains/groups/groups-core.api";
import { addDays, format, isSameDay, startOfDay, endOfDay } from "date-fns";
import { useUpcomingFixturesQuery } from "@/domains/fixtures";
import { useLeaguesQuery } from "@/domains/leagues";
import { useTeamsQuery } from "@/domains/teams";
import { createStyles } from "./createGroupFlow.styles";
import { CreateSheetSelectionStep } from "./CreateSheetSelectionStep";
import { CreateSheetDetailsStep } from "./CreateSheetDetailsStep";
import { CreateSheetAdvancedStep } from "./CreateSheetAdvancedStep";

import { CreateSheetFixtures } from "./CreateSheetFixtures";
import { CreateSheetLeagues } from "./CreateSheetLeagues";
import { CreateSheetTeams } from "./CreateSheetTeams";
import { CreateSheetDetailsStep } from "./CreateSheetDetailsStep";
import { CreateSheetAdvancedStep } from "./CreateSheetAdvancedStep";

/* ─── Create Group Sheet ─── */

export type CreateTab = "fixtures" | "leagues" | "teams";

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
        {step === 0 && (
          <CreateSheetSelectionStep
            activeTab={activeTab}
            onTabPress={handleTabPress}
            dates={dates}
            selectedDate={selectedDate}
            onDatePress={handleDatePress}
            scrollRef={scrollRef}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            currentSortOption={currentSortOption}
            viewMode={viewMode}
            onOpenSort={onOpenSort}
            onToggleViewMode={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setTabViewModeAndPersist((prev) => ({ ...prev, [activeTab]: prev[activeTab] === "list" ? "grid" : "list" }));
            }}
            fixturesQuery={fixturesQuery}
            fixtures={fixtures}
            fixturesByTime={fixturesByTime}
            fixturesByLeague={fixturesByLeague}
            selectedGames={selectedGames}
            toggleGame={toggleGame}
            leaguesQuery={leaguesQuery}
            leagues={leagues}
            selectedLeagues={selectedLeagues}
            toggleLeague={toggleLeague}
            teamsQuery={teamsQuery}
            teams={teams}
            selectedTeams={selectedTeams}
            toggleTeam={toggleTeam}
            pulseStyle={skelPulse}
            skeletonColor={skelColor}
            hasSelection={hasSelection}
            selectionCount={selectionCount}
            onContinue={handleContinue}
            theme={theme}
            bottomInset={insets.bottom}
          />
        )}
        {step === 1 && (
          <CreateSheetDetailsStep
            onOpenAvatarPicker={onOpenAvatarPicker}
            avatarValue={avatarValue}
            groupName={groupName}
            setGroupName={setGroupName}
            groupDescription={groupDescription}
            setGroupDescription={setGroupDescription}
            handleCreateAndPublish={handleCreateAndPublish}
            isCreating={isCreating}
            theme={theme}
            groupNameInputRef={groupNameInputRef}
            descInputRef={descInputRef}
            step1AnimStyle={step1AnimStyle}
          />
        )}
        {step === 2 && (
          <CreateSheetAdvancedStep
            onOpenAdvSheet={onOpenAdvSheet}
            predictionMode={predictionMode}
            onTheNosePoints={onTheNosePoints}
            differencePoints={differencePoints}
            outcomePoints={outcomePoints}
            koRoundMode={koRoundMode}
            maxMembers={maxMembers}
            nudgeEnabled={nudgeEnabled}
            nudgeWindowMinutes={nudgeWindowMinutes}
            inviteAccess={inviteAccess}
            onInviteAccessChange={onInviteAccessChange}
            draftPrivacy={draftPrivacy}
            setDraftPrivacy={setDraftPrivacy}
            durationLabel={durationLabel}
            preview={preview}
            handleCreateAndPublish={handleCreateAndPublish}
            isCreating={isCreating}
            groupName={groupName}
            theme={theme}
            bottomInset={insets.bottom}
          />
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


// Re-export styles for backward compatibility
export { createStyles } from "./createGroupFlow.styles";
