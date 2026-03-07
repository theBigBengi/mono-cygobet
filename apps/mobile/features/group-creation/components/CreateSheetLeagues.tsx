// features/group-creation/components/CreateSheetLeagues.tsx
// Extracted leagues tab content from CreateGroupFlow.tsx

import React from "react";
import { View, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { TeamLogo } from "@/components/ui";
import { createStyles } from "./createGroupFlow.styles";
import { CreateSheetSkeletons } from "./CreateSheetSkeletons";

interface CreateSheetLeaguesProps {
  leaguesQuery: { isFetching: boolean };
  leagues: any[];
  selectedLeagues: Set<string>;
  toggleLeague: (key: string) => void;
  viewMode: "list" | "grid";
  theme: any;
  pulseStyle: any;
  skeletonColor: string;
}

export function CreateSheetLeagues({
  leaguesQuery,
  leagues,
  selectedLeagues,
  toggleLeague,
  viewMode,
  theme,
  pulseStyle,
  skeletonColor,
}: CreateSheetLeaguesProps) {
  const { t } = useTranslation("common");

  if (leaguesQuery.isFetching) {
    return viewMode === "grid"
      ? <CreateSheetSkeletons type="grid" pulseStyle={pulseStyle} skeletonColor={skeletonColor} />
      : <CreateSheetSkeletons type="list" pulseStyle={pulseStyle} skeletonColor={skeletonColor} />;
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
}
