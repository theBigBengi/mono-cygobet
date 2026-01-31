// features/group-creation/components/LeaguesView.tsx
// Leagues list from API. Loading/error/empty + ScrollView + RefreshControl. English only.
// Supports popular leagues preset and search functionality with debouncing.

import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, TextInput, Pressable } from "react-native";
import { AppText, Screen, Card } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useLeaguesQuery } from "@/domains/leagues/leagues.hooks";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";
import { LeagueListItem } from "./LeagueListItem";
import { useDebounce } from "@/hooks/useDebounce";
import { MaterialIcons } from "@expo/vector-icons";

interface LeaguesViewProps {
  tabs?: React.ReactNode;
}

export function LeaguesView({ tabs }: LeaguesViewProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const debouncedSearch = useDebounce(searchQuery, 400);

  // Determine query parameters based on search state
  const queryParams = useMemo(() => {
    if (debouncedSearch.length >= 3) {
      return { search: debouncedSearch.trim() };
    }
    return { preset: "popular" as const };
  }, [debouncedSearch]);

  const { data, isLoading, error, refetch } = useLeaguesQuery({
    page: 1,
    perPage: 20,
    ...queryParams,
  });

  const leagues = data?.data ?? [];
  const isSearchMode = debouncedSearch.length >= 3;

  const renderContent = () => {
    if (isLoading) {
      return <QueryLoadingView message={t("groupCreation.loadingLeagues")} />;
    }

    if (error) {
      return (
        <QueryErrorView
          message={t("groupCreation.failedLoadLeagues")}
          onRetry={() => refetch()}
        />
      );
    }

    if (leagues.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <AppText variant="title" style={styles.emptyTitle}>
            {isSearchMode ? t("groupCreation.noLeaguesFound") : t("groupCreation.noPopularLeagues")}
          </AppText>
          <AppText variant="body" color="secondary" style={styles.emptySubtitle}>
            {isSearchMode
              ? t("groupCreation.tryDifferentSearch")
              : t("groupCreation.noPopularLeaguesDisplay")}
          </AppText>
        </View>
      );
    }

    return (
      <>
        {leagues.map((league) => (
          <LeagueListItem key={league.id} league={league} />
        ))}
      </>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <Screen scroll onRefresh={async () => { await refetch(); }}>
      {tabs}
        {/* Search Input */}
        <Card style={styles.searchContainer}>
          <View style={[styles.searchInputContainer, { borderColor: theme.colors.border }]}>
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

       
        {renderContent()}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
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
});
