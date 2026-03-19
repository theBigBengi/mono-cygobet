// features/group-creation/components/CreateSheetFixtures.tsx
// Extracted fixtures tab content from CreateGroupFlow.tsx

import React from "react";
import { View, Pressable, Text, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { TeamLogo } from "@/components/ui";
import { createStyles } from "./createGroupFlow.styles";
import { CreateSheetSkeletons } from "./CreateSheetSkeletons";
import type { FixtureItem } from "@/types/common";
import type { Theme } from "@/lib/theme/theme.types";
import type { AnimatedStyleProp } from "react-native-reanimated";

interface FixturesByLeagueSection {
  league: { id: number; name: string; imagePath: string | null };
  fixtures: FixtureItem[];
}

interface CreateSheetFixturesProps {
  fixturesQuery: { isFetching: boolean };
  fixtures: FixtureItem[];
  fixturesByTime: FixtureItem[];
  fixturesByLeague: FixturesByLeagueSection[];
  selectedGames: Set<string>;
  toggleGame: (key: string) => void;
  viewMode: "list" | "grid";
  currentSortOption: string;
  theme: Theme;
  pulseStyle: AnimatedStyleProp<ViewStyle>;
  skeletonColor: string;
}

export function CreateSheetFixtures({
  fixturesQuery,
  fixtures,
  fixturesByTime,
  fixturesByLeague,
  selectedGames,
  toggleGame,
  viewMode,
  currentSortOption,
  theme,
  pulseStyle,
  skeletonColor,
}: CreateSheetFixturesProps) {
  const { t } = useTranslation("common");

  if (fixturesQuery.isFetching) {
    return viewMode === "grid"
      ? <CreateSheetSkeletons type="fixtureGrid" pulseStyle={pulseStyle} skeletonColor={skeletonColor} />
      : <CreateSheetSkeletons type="fixtureList" pulseStyle={pulseStyle} skeletonColor={skeletonColor} />;
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
        {footer ? <Text style={[createStyles.gameFooterText, { color: theme.colors.textSecondary, marginBottom: theme.spacing.xs }]}>{footer}</Text> : null}
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
}
