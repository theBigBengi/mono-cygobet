// features/group-creation/components/CreateGroupFlow.tsx
// Self-contained create-group flow: wizard + all settings sheets + avatar picker.
// groups.tsx only needs to pass sheetRef and groupCount.

import React, { useState, useCallback, useRef, useMemo, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View,
  Pressable,
  ScrollView,
  TextInput,
  Text,
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
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useCreateGroupMutation, useGroupPreviewQuery } from "@/domains/groups";
import { useLeaguePreferences } from "@/domains/preferences";
import { publishGroup, updateGroup } from "@/domains/groups/groups-core.api";
import { addDays, format, isSameDay, startOfDay, endOfDay } from "date-fns";
import { useUpcomingFixturesQuery } from "@/domains/fixtures";
import { useLeaguesQuery } from "@/domains/leagues";
import { useTeamsQuery } from "@/domains/teams";
import { AvatarPickerSheet } from "@/features/groups/group-lobby/components/AvatarPickerSheet";
import { createStyles } from "./createGroupFlow.styles";
import { CreateSheetSelectionStep } from "./CreateSheetSelectionStep";
import { CreateSheetDetailsStep } from "./CreateSheetDetailsStep";
import { CreateSheetAdvancedStep } from "./CreateSheetAdvancedStep";

/* ─── Types ─── */

export type CreateTab = "fixtures" | "leagues" | "teams";

const CREATE_SORT_OPTIONS = [
  { key: "time", labelKey: "groupCreation.sortByTime" },
  { key: "league", labelKey: "groupCreation.sortByLeague" },
] as const;

/* ─── Main Component ─── */

export function CreateGroupFlow({
  sheetRef,
  groupCount,
}: {
  sheetRef: React.RefObject<React.ComponentRef<typeof BottomSheetModal>>;
  groupCount: number;
}) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // ── Wizard state ──
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
  const createGroupMutation = useCreateGroupMutation();
  const [isCreating, setIsCreating] = useState(false);
  const [draftPrivacy, setDraftPrivacy] = useState<"private" | "public">("private");
  const slideDirection = useRef<"forward" | "back">("forward");
  const step1Padding = useSharedValue(insets.bottom);

  // ── Settings state (previously in groups.tsx) ──
  const [avatarValue, setAvatarValue] = useState("0");
  const [nudgeEnabled, setNudgeEnabled] = useState(true);
  const [nudgeWindowMinutes, setNudgeWindowMinutes] = useState(60);
  const [inviteAccess, setInviteAccess] = useState<"all" | "admin_only">("all");
  const [onTheNosePoints, setOnTheNosePoints] = useState(3);
  const [differencePoints, setDifferencePoints] = useState(2);
  const [outcomePoints, setOutcomePoints] = useState(1);
  const [predictionMode, setPredictionMode] = useState<"CorrectScore" | "ThreeWay">("CorrectScore");
  const [koRoundMode, setKoRoundMode] = useState<"FullTime" | "ExtraTime" | "Penalties">("FullTime");
  const [maxMembers, setMaxMembers] = useState(50);
  const [tabSortOptions, setTabSortOptions] = useState<Record<CreateTab, string>>({
    fixtures: "time",
    leagues: "time",
    teams: "time",
  });

  // ── Settings sheet refs ──
  const createSortSheetRef = useRef<BottomSheetModal>(null);
  const advPredictionRef = useRef<BottomSheetModal>(null);
  const advScoringRef = useRef<BottomSheetModal>(null);
  const advKoRef = useRef<BottomSheetModal>(null);
  const advMembersRef = useRef<BottomSheetModal>(null);
  const advNudgeWindowRef = useRef<BottomSheetModal>(null);
  const avatarPickerRef = useRef<BottomSheetModal>(null);
  const createSortActiveTabRef = useRef<CreateTab>("fixtures");

  // Initial values for "done" button disabled state
  const initialNudgeEnabled = useRef(true);
  const initialPredictionMode = useRef(predictionMode);
  const initialKoRoundMode = useRef(koRoundMode);
  const initialMaxMembers = useRef(maxMembers);
  const initialNudgeWindow = useRef(nudgeWindowMinutes);
  const initialOnTheNose = useRef(onTheNosePoints);
  const initialDifference = useRef(differencePoints);
  const initialOutcome = useRef(outcomePoints);

  // ── Per-tab view mode — persisted ──
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

  // ── Keyboard handling ──
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardWillShow", (e) => {
      step1Padding.value = withTiming(e.endCoordinates.height - insets.top, { duration: e.duration || 250 });
    });
    const hideSub = Keyboard.addListener("keyboardWillHide", (e) => {
      step1Padding.value = withTiming(insets.bottom, { duration: e.duration || 250 });
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, [step1Padding, insets.top, insets.bottom]);

  const step1AnimStyle = useAnimatedStyle(() => ({
    flex: 1,
    paddingBottom: step1Padding.value,
  }));

  // ── Step transitions ──
  useEffect(() => {
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

  // ── Selection ──
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

    const selectionMode: "games" | "leagues" | "teams" =
      activeTab === "fixtures" ? "games" : activeTab === "leagues" ? "leagues" : "teams";

    const createBody: Parameters<typeof createGroupMutation.mutateAsync>[0] = {
      name: groupName.trim(),
      privacy: "private",
      selectionMode,
      ...(activeTab === "fixtures" && { fixtureIds: Array.from(selectedGames).map(Number) }),
      ...(activeTab === "leagues" && { leagueIds: Array.from(selectedLeagues).map(Number) }),
      ...(activeTab === "teams" && { teamIds: Array.from(selectedTeams).map(Number) }),
    };

    try {
      const result = await createGroupMutation.mutateAsync(createBody);
      const groupId = result.data.id;

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

      await updateGroup(groupId, {
        avatarType: "gradient",
        avatarValue,
      });

      sheetRef.current?.dismiss();
      setStep(0);
      setSelectedGames(new Set());
      setSelectedLeagues(new Set());
      setSelectedTeams(new Set());
      setGroupName("");
      setGroupDescription("");
      router.push({ pathname: '/groups/[id]', params: { id: String(groupId) } });
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
    setSelectedLeagues((prev) => (prev.has(key) ? new Set() : new Set([key])));
  };

  const toggleTeam = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTeams((prev) => (prev.has(key) ? new Set() : new Set([key])));
  };

  const dates = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return Array.from({ length: 14 }, (_, i) => addDays(start, i));
  }, []);

  // ── Data hooks ──
  const fixturesFrom = useMemo(() => {
    if (isSameDay(selectedDate, new Date())) {
      return new Date().toISOString();
    }
    return startOfDay(selectedDate).toISOString();
  }, [selectedDate]);

  const fixturesQuery = useUpcomingFixturesQuery({
    from: fixturesFrom,
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

  // Skeleton pulse
  const skelOpacity = useSharedValue(0.4);
  useEffect(() => {
    skelOpacity.value = withRepeat(withTiming(1, { duration: 700 }), -1, true);
  }, [skelOpacity]);
  const skelPulse = useAnimatedStyle(() => ({ opacity: skelOpacity.value }));
  const skelColor = theme.colors.border;

  const fixturesByTime = useMemo(
    () => [...fixtures].sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt)),
    [fixtures],
  );

  const { data: leaguePrefs } = useLeaguePreferences();
  const leagueOrder = leaguePrefs?.data?.leagueOrder ?? undefined;

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

    const result = Array.from(groups.values());

    // Sort by user's preferred league order, then by earliest kickoff
    const orderMap = leagueOrder?.length
      ? new Map(leagueOrder.map((id, idx) => [id, idx]))
      : null;

    return result.sort((a, b) => {
      if (orderMap) {
        const aOrder = orderMap.get(a.league.id);
        const bOrder = orderMap.get(b.league.id);
        if (aOrder !== undefined && bOrder !== undefined) {
          if (aOrder !== bOrder) return aOrder - bOrder;
        } else if (aOrder !== undefined) return -1;
        else if (bOrder !== undefined) return 1;
      }
      const timeA = a.fixtures[0]?.kickoffAt ?? "";
      const timeB = b.fixtures[0]?.kickoffAt ?? "";
      return timeA.localeCompare(timeB);
    });
  }, [fixtures, leagueOrder]);

  // ── Handlers for child sheets ──
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />
    ),
    [],
  );

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

  const handleOpenSort = useCallback((tab: CreateTab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    createSortActiveTabRef.current = tab;
    createSortSheetRef.current?.present();
  }, []);

  const handleSelectSort = useCallback((key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const tab = createSortActiveTabRef.current;
    setTabSortOptions((prev) => ({ ...prev, [tab]: key }));
    createSortSheetRef.current?.dismiss();
  }, []);

  const handleOpenAdvSheet = useCallback((sheet: "prediction" | "scoring" | "ko" | "members" | "nudgeWindow") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (sheet === "prediction") initialPredictionMode.current = predictionMode;
    if (sheet === "ko") initialKoRoundMode.current = koRoundMode;
    if (sheet === "members") initialMaxMembers.current = maxMembers;
    if (sheet === "nudgeWindow") { initialNudgeWindow.current = nudgeWindowMinutes; initialNudgeEnabled.current = nudgeEnabled; }
    if (sheet === "scoring") {
      initialOnTheNose.current = onTheNosePoints;
      initialDifference.current = differencePoints;
      initialOutcome.current = outcomePoints;
    }
    const refs = { prediction: advPredictionRef, scoring: advScoringRef, ko: advKoRef, members: advMembersRef, nudgeWindow: advNudgeWindowRef };
    refs[sheet].current?.present();
  }, [predictionMode, koRoundMode, maxMembers, nudgeWindowMinutes, nudgeEnabled, onTheNosePoints, differencePoints, outcomePoints]);

  const handleOpenAvatarPicker = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    avatarPickerRef.current?.present();
  }, []);

  return (
    <>
      {/* Main wizard sheet */}
      <BottomSheetModal
        ref={sheetRef}
        topInset={insets.top}
        snapPoints={["100%"]}
        enableDynamicSizing={false}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
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
          <View style={[createStyles.header, { borderBottomColor: theme.colors.border }]}>
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
              onOpenSort={handleOpenSort}
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
              onOpenAvatarPicker={handleOpenAvatarPicker}
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
              onOpenAdvSheet={handleOpenAdvSheet}
              predictionMode={predictionMode}
              onTheNosePoints={onTheNosePoints}
              differencePoints={differencePoints}
              outcomePoints={outcomePoints}
              koRoundMode={koRoundMode}
              maxMembers={maxMembers}
              nudgeEnabled={nudgeEnabled}
              nudgeWindowMinutes={nudgeWindowMinutes}
              inviteAccess={inviteAccess}
              onInviteAccessChange={setInviteAccess}
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

      {/* Sort sheet */}
      <BottomSheetModal
        ref={createSortSheetRef}
        stackBehavior="push"
        enableDynamicSizing
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary }}
      >
        <BottomSheetView style={createStyles.sortSheet}>
          <Text style={[createStyles.sortSheetTitle, { color: theme.colors.textSecondary }]}>
            {t("groupCreation.sortBy")}
          </Text>
          {CREATE_SORT_OPTIONS.map((option) => {
            const isActive = tabSortOptions[createSortActiveTabRef.current] === option.key;
            return (
              <Pressable
                key={option.key}
                onPress={() => handleSelectSort(option.key)}
                style={({ pressed }) => [createStyles.sortSheetItem, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Text style={[createStyles.sortSheetItemText, { color: isActive ? theme.colors.primary : theme.colors.textPrimary }]}>
                  {t(option.labelKey)}
                </Text>
                {isActive && <Ionicons name="checkmark" size={22} color={theme.colors.primary} />}
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => createSortSheetRef.current?.dismiss()}
            style={({ pressed }) => [createStyles.sortSheetCancel, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[createStyles.sortSheetCancelText, { color: theme.colors.textSecondary }]}>
              {t("groupCreation.cancel")}
            </Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>

      {/* Prediction mode sheet */}
      <BottomSheetModal ref={advPredictionRef} stackBehavior="push" enableDynamicSizing enablePanDownToClose backdropComponent={renderBackdrop} backgroundStyle={{ backgroundColor: theme.colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20 }} handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary }}>
        <BottomSheetView style={createStyles.sheetContent}>
          <Text style={[createStyles.sheetTitle, { color: theme.colors.textPrimary, borderBottomColor: theme.colors.textPrimary + "10" }]}>{t("lobby.predictionMode")}</Text>
          {([
            { value: "CorrectScore" as const, label: t("lobby.exactResult") },
            { value: "ThreeWay" as const, label: t("lobby.matchWinner") },
          ]).map((opt) => (
            <Pressable key={opt.value} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPredictionMode(opt.value); }} style={({ pressed }) => [createStyles.sheetOption, { opacity: pressed ? 0.6 : 1 }]}>
              <Text style={[createStyles.sheetOptionLabel, { color: theme.colors.textPrimary }]}>{opt.label}</Text>
              <Ionicons name={opt.value === predictionMode ? "radio-button-on" : "radio-button-off"} size={18} color={opt.value === predictionMode ? theme.colors.primary : theme.colors.textSecondary} />
            </Pressable>
          ))}
          <Pressable
            onPress={() => advPredictionRef.current?.dismiss()}
            disabled={predictionMode === initialPredictionMode.current}
            style={({ pressed }) => [createStyles.sheetDoneBtn, { backgroundColor: theme.colors.primary, opacity: predictionMode === initialPredictionMode.current ? 0.4 : pressed ? 0.8 : 1 }]}
          >
            <Text style={[createStyles.sheetDoneBtnText, { color: theme.colors.textInverse }]}>{t("done")}</Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>

      {/* Scoring sheet */}
      <BottomSheetModal ref={advScoringRef} stackBehavior="push" enableDynamicSizing enablePanDownToClose backdropComponent={renderBackdrop} backgroundStyle={{ backgroundColor: theme.colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20 }} handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary }}>
        <BottomSheetView style={createStyles.sheetContent}>
          <Text style={[createStyles.sheetTitle, { color: theme.colors.textPrimary, borderBottomColor: theme.colors.textPrimary + "10" }]}>{t("lobby.scoring")}</Text>
          {[
            { label: t("lobby.onTheNose"), value: onTheNosePoints, set: setOnTheNosePoints },
            { label: t("lobby.goalPointDifference"), value: differencePoints, set: setDifferencePoints },
            { label: t("lobby.outcome"), value: outcomePoints, set: setOutcomePoints },
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
            disabled={onTheNosePoints === initialOnTheNose.current && differencePoints === initialDifference.current && outcomePoints === initialOutcome.current}
            style={({ pressed }) => {
              const unchanged = onTheNosePoints === initialOnTheNose.current && differencePoints === initialDifference.current && outcomePoints === initialOutcome.current;
              return [createStyles.sheetDoneBtn, { backgroundColor: theme.colors.primary, opacity: unchanged ? 0.4 : pressed ? 0.8 : 1 }];
            }}
          >
            <Text style={[createStyles.sheetDoneBtnText, { color: theme.colors.textInverse }]}>{t("done")}</Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>

      {/* KO round mode sheet */}
      <BottomSheetModal ref={advKoRef} stackBehavior="push" enableDynamicSizing enablePanDownToClose backdropComponent={renderBackdrop} backgroundStyle={{ backgroundColor: theme.colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20 }} handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary }}>
        <BottomSheetView style={createStyles.sheetContent}>
          <Text style={[createStyles.sheetTitle, { color: theme.colors.textPrimary, borderBottomColor: theme.colors.textPrimary + "10" }]}>{t("lobby.koRoundMode")}</Text>
          {([
            { value: "FullTime" as const, label: t("lobby.90min") },
            { value: "ExtraTime" as const, label: t("lobby.extraTime") },
            { value: "Penalties" as const, label: t("lobby.penalties") },
          ]).map((opt) => (
            <Pressable key={opt.value} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setKoRoundMode(opt.value); }} style={({ pressed }) => [createStyles.sheetOption, { opacity: pressed ? 0.6 : 1 }]}>
              <Text style={[createStyles.sheetOptionLabel, { color: theme.colors.textPrimary }]}>{opt.label}</Text>
              <Ionicons name={opt.value === koRoundMode ? "radio-button-on" : "radio-button-off"} size={18} color={opt.value === koRoundMode ? theme.colors.primary : theme.colors.textSecondary} />
            </Pressable>
          ))}
          <Pressable
            onPress={() => advKoRef.current?.dismiss()}
            disabled={koRoundMode === initialKoRoundMode.current}
            style={({ pressed }) => [createStyles.sheetDoneBtn, { backgroundColor: theme.colors.primary, opacity: koRoundMode === initialKoRoundMode.current ? 0.4 : pressed ? 0.8 : 1 }]}
          >
            <Text style={[createStyles.sheetDoneBtnText, { color: theme.colors.textInverse }]}>{t("done")}</Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>

      {/* Max members sheet */}
      <BottomSheetModal ref={advMembersRef} stackBehavior="push" enableDynamicSizing enablePanDownToClose backdropComponent={renderBackdrop} backgroundStyle={{ backgroundColor: theme.colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20 }} handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary }}>
        <BottomSheetView style={createStyles.sheetContent}>
          <Text style={[createStyles.sheetTitle, { color: theme.colors.textPrimary, borderBottomColor: theme.colors.textPrimary + "10" }]}>{t("lobby.maxMembers")}</Text>
          {[10, 20, 30, 50, 100].map((num) => (
            <Pressable key={num} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMaxMembers(num); }} style={({ pressed }) => [createStyles.sheetOption, { opacity: pressed ? 0.6 : 1 }]}>
              <Text style={[createStyles.sheetOptionLabel, { color: theme.colors.textPrimary }]}>{num}</Text>
              <Ionicons name={num === maxMembers ? "radio-button-on" : "radio-button-off"} size={18} color={num === maxMembers ? theme.colors.primary : theme.colors.textSecondary} />
            </Pressable>
          ))}
          <Pressable
            onPress={() => advMembersRef.current?.dismiss()}
            disabled={maxMembers === initialMaxMembers.current}
            style={({ pressed }) => [createStyles.sheetDoneBtn, { backgroundColor: theme.colors.primary, opacity: maxMembers === initialMaxMembers.current ? 0.4 : pressed ? 0.8 : 1 }]}
          >
            <Text style={[createStyles.sheetDoneBtnText, { color: theme.colors.textInverse }]}>{t("done")}</Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>

      {/* Nudge sheet */}
      <BottomSheetModal ref={advNudgeWindowRef} stackBehavior="push" enableDynamicSizing enablePanDownToClose backdropComponent={renderBackdrop} backgroundStyle={{ backgroundColor: theme.colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20 }} handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary }}>
        <BottomSheetView style={createStyles.sheetContent}>
          <View style={{ borderBottomWidth: 1, borderBottomColor: theme.colors.textPrimary + "10", paddingBottom: 12, marginBottom: 8 }}>
            <Text style={{ fontSize: 15, fontWeight: "600", textAlign: "center", color: theme.colors.textPrimary }}>{t("lobby.nudge")}</Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12, lineHeight: 17, textAlign: "center", marginTop: 4 }}>{t("lobby.nudgeDescription")}</Text>
          </View>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setNudgeEnabled((prev) => !prev); }}
            style={createStyles.sheetOption}
          >
            <Text style={[createStyles.sheetOptionLabel, { color: theme.colors.textPrimary }]}>{t("lobby.nudge")}</Text>
            <View style={[createStyles.advToggle, { backgroundColor: nudgeEnabled ? theme.colors.primary : theme.colors.textSecondary + "30" }]}>
              <View style={[createStyles.advToggleKnob, { alignSelf: nudgeEnabled ? "flex-end" : "flex-start" }]} />
            </View>
          </Pressable>
          <View style={{ opacity: nudgeEnabled ? 1 : 0.35 }} pointerEvents={nudgeEnabled ? "auto" : "none"}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontWeight: "500", marginBottom: 4, marginTop: 8 }}>{t("lobby.minutesBeforeKickoff")}</Text>
            {[30, 60, 120, 180].map((min) => (
              <Pressable key={min} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setNudgeWindowMinutes(min); }} style={({ pressed }) => [createStyles.sheetOption, { opacity: pressed ? 0.6 : 1 }]}>
                <Text style={[createStyles.sheetOptionLabel, { color: theme.colors.textPrimary }]}>{min} min</Text>
                <Ionicons name={min === nudgeWindowMinutes ? "radio-button-on" : "radio-button-off"} size={18} color={min === nudgeWindowMinutes ? theme.colors.primary : theme.colors.textSecondary} />
              </Pressable>
            ))}
          </View>
          <Pressable
            onPress={() => advNudgeWindowRef.current?.dismiss()}
            disabled={nudgeEnabled === initialNudgeEnabled.current && nudgeWindowMinutes === initialNudgeWindow.current}
            style={({ pressed }) => {
              const unchanged = nudgeEnabled === initialNudgeEnabled.current && nudgeWindowMinutes === initialNudgeWindow.current;
              return [createStyles.sheetDoneBtn, { backgroundColor: theme.colors.primary, opacity: unchanged ? 0.4 : pressed ? 0.8 : 1 }];
            }}
          >
            <Text style={[createStyles.sheetDoneBtnText, { color: theme.colors.textInverse }]}>{t("done")}</Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>

      {/* Avatar picker sheet */}
      <AvatarPickerSheet
        sheetRef={avatarPickerRef}
        selectedValue={avatarValue}
        onSelect={setAvatarValue}
        initials="GR"
      />
    </>
  );
}

// Re-export for backward compatibility
export { createStyles } from "./createGroupFlow.styles";
