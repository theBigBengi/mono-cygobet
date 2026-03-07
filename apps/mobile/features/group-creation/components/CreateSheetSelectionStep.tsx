// features/group-creation/components/CreateSheetSelectionStep.tsx
// Step 0 of the create group wizard: date/search bar, sort row, fixtures/leagues/teams content, bottom tabs.

import React from "react";
import { View, ScrollView, Pressable, Text, TextInput, type ViewStyle } from "react-native";
import type { AnimatedStyleProp } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { AppText } from "@/components/ui";
import { isSameDay, isToday, format } from "date-fns";
import { createStyles } from "./createGroupFlow.styles";
import { CreateSheetFixtures } from "./CreateSheetFixtures";
import { CreateSheetLeagues } from "./CreateSheetLeagues";
import { CreateSheetTeams } from "./CreateSheetTeams";
import type { CreateTab } from "./CreateGroupFlow";
import type { FixtureItem } from "@/types/common";
import type { ApiLeagueItem, ApiTeamItem } from "@repo/types";
import type { Theme } from "@/lib/theme/theme.types";

interface FixturesByLeagueSection {
  league: { id: number; name: string; imagePath: string | null };
  fixtures: FixtureItem[];
}

const CREATE_TABS: { key: CreateTab; labelKey: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "fixtures", labelKey: "groupCreation.freeSelection", icon: "grid-outline" },
  { key: "leagues", labelKey: "groupCreation.leagues", icon: "trophy-outline" },
  { key: "teams", labelKey: "groupCreation.teams", icon: "shirt-outline" },
];

interface CreateSheetSelectionStepProps {
  activeTab: CreateTab;
  onTabPress: (tab: CreateTab) => void;
  // Date slider
  dates: Date[];
  selectedDate: Date;
  onDatePress: (date: Date) => void;
  scrollRef: React.RefObject<ScrollView>;
  // Search
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  // Sort & view mode
  currentSortOption: string;
  viewMode: "list" | "grid";
  onOpenSort: (tab: CreateTab) => void;
  onToggleViewMode: () => void;
  // Fixtures
  fixturesQuery: { isFetching: boolean };
  fixtures: FixtureItem[];
  fixturesByTime: FixtureItem[];
  fixturesByLeague: FixturesByLeagueSection[];
  selectedGames: Set<string>;
  toggleGame: (key: string) => void;
  // Leagues
  leaguesQuery: { isFetching: boolean };
  leagues: ApiLeagueItem[];
  selectedLeagues: Set<string>;
  toggleLeague: (key: string) => void;
  // Teams
  teamsQuery: { isFetching: boolean };
  teams: ApiTeamItem[];
  selectedTeams: Set<string>;
  toggleTeam: (key: string) => void;
  // Skeleton
  pulseStyle: AnimatedStyleProp<ViewStyle>;
  skeletonColor: string;
  // Continue
  hasSelection: boolean;
  selectionCount: number;
  onContinue: () => void;
  // Theme & insets
  theme: Theme;
  bottomInset: number;
}

export function CreateSheetSelectionStep({
  activeTab,
  onTabPress,
  dates,
  selectedDate,
  onDatePress,
  scrollRef,
  searchQuery,
  setSearchQuery,
  currentSortOption,
  viewMode,
  onOpenSort,
  onToggleViewMode,
  fixturesQuery,
  fixtures,
  fixturesByTime,
  fixturesByLeague,
  selectedGames,
  toggleGame,
  leaguesQuery,
  leagues,
  selectedLeagues,
  toggleLeague,
  teamsQuery,
  teams,
  selectedTeams,
  toggleTeam,
  pulseStyle,
  skeletonColor,
  hasSelection,
  selectionCount,
  onContinue,
  theme,
  bottomInset,
}: CreateSheetSelectionStepProps) {
  const { t } = useTranslation("common");

  return (
    <>
      {/* Date slider — fixtures only */}
      {activeTab === "fixtures" && (
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
                  onPress={() => onDatePress(date)}
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
      {(activeTab === "leagues" || activeTab === "teams") && (
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
      <View style={{ flex: 1 }}>
        <ScrollView style={createStyles.content} contentContainerStyle={createStyles.contentInner}>
          {/* Sort row */}
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
              onPress={onToggleViewMode}
              style={({ pressed }) => [
                createStyles.viewModeBtn,
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Ionicons name={viewMode === "list" ? "grid-outline" : "list"} size={14} color={theme.colors.textSecondary} />
            </Pressable>
          </View>

          {activeTab === "fixtures" && (
            <CreateSheetFixtures
              fixturesQuery={fixturesQuery}
              fixtures={fixtures}
              fixturesByTime={fixturesByTime}
              fixturesByLeague={fixturesByLeague}
              selectedGames={selectedGames}
              toggleGame={toggleGame}
              viewMode={viewMode}
              currentSortOption={currentSortOption}
              theme={theme}
              pulseStyle={pulseStyle}
              skeletonColor={skeletonColor}
            />
          )}
          {activeTab === "leagues" && (
            <CreateSheetLeagues
              leaguesQuery={leaguesQuery}
              leagues={leagues}
              selectedLeagues={selectedLeagues}
              toggleLeague={toggleLeague}
              viewMode={viewMode}
              theme={theme}
              pulseStyle={pulseStyle}
              skeletonColor={skeletonColor}
            />
          )}
          {activeTab === "teams" && (
            <CreateSheetTeams
              teamsQuery={teamsQuery}
              teams={teams}
              selectedTeams={selectedTeams}
              toggleTeam={toggleTeam}
              viewMode={viewMode}
              theme={theme}
              pulseStyle={pulseStyle}
              skeletonColor={skeletonColor}
            />
          )}
        </ScrollView>
      </View>

      {/* Bottom: continue + tabs */}
      <View
        style={[
          createStyles.tabBar,
          {
            backgroundColor: theme.colors.background,
            paddingBottom: Math.max(bottomInset, 12),
            shadowColor: theme.colors.background,
            shadowOffset: { width: 0, height: -6 },
            shadowOpacity: 1,
            shadowRadius: 6,
            elevation: 10,
          },
        ]}
      >
        <Pressable
          onPress={onContinue}
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
                onPress={() => onTabPress(tab.key)}
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
    </>
  );
}
