// features/group-creation/filters/LeagueFilterList.tsx
// League list with search and multi-select; selected leagues pinned at top.

import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  ListRenderItemInfo,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { AppText, Card, TeamLogo } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useLeaguesQuery } from "@/domains/leagues/leagues.hooks";
import { useDebounce } from "@/hooks/useDebounce";
import type { ApiLeagueItem } from "@repo/types";

interface LeagueFilterListProps {
  selectedLeagueIds: number[];
  onSelectionChange: (ids: number[]) => void;
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
          { opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <TeamLogo
          imagePath={item.imagePath}
          teamName={item.name}
          size={24}
        />
        <AppText variant="body" style={styles.name} numberOfLines={1}>
          {item.name}
        </AppText>
        <MaterialIcons
          name={isSelected ? "check-box" : "check-box-outline-blank"}
          size={24}
          color={isSelected ? theme.colors.primary : theme.colors.textSecondary}
        />
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <Card style={styles.searchContainer}>
        <View
          style={[
            styles.searchInputContainer,
            { borderColor: theme.colors.border },
          ]}
        >
          <MaterialIcons
            name="search"
            size={20}
            color={theme.colors.textSecondary}
            style={styles.searchIcon}
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
              <MaterialIcons
                name="close"
                size={20}
                color={theme.colors.textSecondary}
              />
            </Pressable>
          )}
        </View>
      </Card>

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
        <FlatList
          data={orderedLeagues}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          style={styles.list}
          contentContainerStyle={styles.listContent}
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
  searchContainer: {
    marginBottom: 8,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginEnd: 8,
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
    paddingBottom: 24,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  name: {
    flex: 1,
  },
});
