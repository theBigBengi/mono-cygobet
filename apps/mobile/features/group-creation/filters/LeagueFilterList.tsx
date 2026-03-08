// features/group-creation/filters/LeagueFilterList.tsx
// League list with search and multi-select; selected leagues pinned at top.

import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  ListRenderItemInfo,
} from "react-native";
import { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { AppText, TeamLogo } from "@/components/ui";
import { useTheme, CARD_BORDER_BOTTOM_WIDTH } from "@/lib/theme";
import { useLeaguesQuery } from "@/domains/leagues/leagues.hooks";
import { useDebounce } from "@/hooks/useDebounce";
import type { ApiLeagueItem } from "@repo/types";

interface LeagueFilterListProps {
  selectedLeagueIds: number[];
  onSelectionChange: (ids: number[]) => void;
  listBottomPadding?: number;
}

function orderLeaguesWithSelectedFirst(
  leagues: ApiLeagueItem[],
  selectedIds: number[]
): ApiLeagueItem[] {
  const byId = new Map(leagues.map((l) => [l.id, l]));
  const selected: ApiLeagueItem[] = [];
  const rest: ApiLeagueItem[] = [];
  for (const id of selectedIds) {
    const league = byId.get(id);
    if (league) selected.push(league);
  }
  for (const league of leagues) {
    if (!selectedIds.includes(league.id)) rest.push(league);
  }
  return [...selected, ...rest];
}

export function LeagueFilterList({
  selectedLeagueIds,
  onSelectionChange,
  listBottomPadding = 80,
}: LeagueFilterListProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 400);

  const queryParams = useMemo(() => {
    if (debouncedSearch.trim().length >= 3) {
      return { search: debouncedSearch.trim(), page: 1, perPage: 20 };
    }
    return { preset: "popular" as const, page: 1, perPage: 20 };
  }, [debouncedSearch]);

  const { data, isLoading, error } = useLeaguesQuery(queryParams);
  const leagues = data?.data ?? [];

  const orderedLeagues = useMemo(
    () => orderLeaguesWithSelectedFirst(leagues, selectedLeagueIds),
    [leagues, selectedLeagueIds]
  );

  const toggleLeague = (league: ApiLeagueItem) => {
    const id = league.id;
    if (selectedLeagueIds.includes(id)) {
      onSelectionChange(selectedLeagueIds.filter((x) => x !== id));
    } else {
      onSelectionChange([...selectedLeagueIds, id]);
    }
  };

  const renderItem = ({ item }: ListRenderItemInfo<ApiLeagueItem>) => {
    const isSelected = selectedLeagueIds.includes(item.id);
    return (
      <Pressable
        onPress={() => toggleLeague(item)}
        style={({ pressed }) => [
          styles.row,
          {
            backgroundColor: isSelected
              ? theme.colors.primary + "08"
              : theme.colors.surface,
            borderColor: isSelected
              ? theme.colors.primary + "40"
              : theme.colors.border,
            borderBottomColor: isSelected
              ? theme.colors.primary + "40"
              : theme.colors.textSecondary + "30",
            shadowColor: "#000",
            shadowOpacity: pressed ? 0 : isSelected ? 0.15 : 0.08,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
      >
        <View style={[styles.logoContainer, { backgroundColor: theme.colors.textPrimary + "08" }]}>
          <TeamLogo
            imagePath={item.imagePath}
            teamName={item.name}
            size={32}
          />
        </View>
        <View style={styles.nameContainer}>
          <AppText variant="body" style={[
            styles.name,
            { color: isSelected ? theme.colors.primary : theme.colors.textPrimary },
          ]} numberOfLines={1}>
            {item.name}
          </AppText>
          {item.country?.name && (
            <AppText variant="caption" color="secondary" numberOfLines={1}>
              {item.country.name}
            </AppText>
          )}
        </View>
        <Ionicons
          name={isSelected ? "checkmark-circle" : "ellipse-outline"}
          size={24}
          color={isSelected ? theme.colors.primary : theme.colors.textSecondary}
        />
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View
        style={[
          styles.searchInputContainer,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Ionicons
          name="search"
          size={20}
          color={theme.colors.textSecondary}
        />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.textPrimary }]}
          placeholder={t("groupCreation.searchLeaguesPlaceholder")}
          placeholderTextColor={theme.colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <Pressable
            onPress={() => setSearchQuery("")}
            style={styles.clearButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="close"
              size={18}
              color={theme.colors.textSecondary}
            />
          </Pressable>
        )}
      </View>

      {isLoading && (
        <AppText variant="body" color="secondary" style={styles.message}>
          {t("groupCreation.loadingLeagues")}
        </AppText>
      )}
      {error && (
        <AppText variant="body" color="danger" style={styles.message}>
          {t("groupCreation.failedLoadLeagues")}
        </AppText>
      )}
      {!isLoading && !error && orderedLeagues.length === 0 && (
        <AppText variant="body" color="secondary" style={styles.message}>
          {debouncedSearch.trim().length >= 3
            ? t("groupCreation.noLeaguesFound")
            : t("groupCreation.noPopularLeagues")}
        </AppText>
      )}
      {!isLoading && !error && orderedLeagues.length > 0 && (
        <BottomSheetFlatList
          data={orderedLeagues}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          style={styles.list}
          contentContainerStyle={[styles.listContent, { paddingBottom: listBottomPadding }]}
          showsVerticalScrollIndicator
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  clearButton: {
    marginStart: 8,
    padding: 4,
  },
  message: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    textAlign: "center",
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderBottomWidth: CARD_BORDER_BOTTOM_WIDTH,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
    gap: 12,
  },
  logoContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    // backgroundColor set inline with theme
    justifyContent: "center",
    alignItems: "center",
  },
  nameContainer: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
  },
});
