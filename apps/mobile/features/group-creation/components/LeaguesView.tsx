// features/group-creation/components/LeaguesView.tsx
// Leagues list from API. Loading/error/empty + ScrollView + RefreshControl. English only.
// Supports popular leagues preset and search functionality with debouncing.

import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, TextInput, Pressable } from "react-native";
import { AppText, Screen } from "@/components/ui";
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
  const [searchFocused, setSearchFocused] = useState(false);
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
    includeCountry: true,
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
            {isSearchMode
              ? t("groupCreation.noLeaguesFound")
              : t("groupCreation.noPopularLeagues")}
          </AppText>
          <AppText
            variant="body"
            color="secondary"
            style={styles.emptySubtitle}
          >
            {isSearchMode
              ? t("groupCreation.tryDifferentSearch")
              : t("groupCreation.noPopularLeaguesDisplay")}
          </AppText>
        </View>
      );
    }

    return (
      <View style={styles.listContainer}>
        {leagues.map((league) => (
          <LeagueListItem key={league.id} league={league} />
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <Screen
        scroll
        safeAreaEdges={[]}
        onRefresh={async () => {
          await refetch();
        }}
      >
        {tabs}
        {/* Search Input */}
        <View style={styles.searchContainer}>
          <View
            style={[
              styles.searchInputContainer,
              {
                backgroundColor: searchFocused
                  ? theme.colors.primary
                  : theme.colors.surface,
                borderColor: searchFocused
                  ? theme.colors.primary
                  : theme.colors.border,
                borderBottomColor: searchFocused
                  ? theme.colors.primary
                  : theme.colors.textSecondary + "40",
                shadowColor: "#000",
                shadowOpacity: searchFocused ? 0.25 : 0.1,
              },
            ]}
          >
            <View
              style={[
                styles.searchIconContainer,
                {
                  backgroundColor: searchFocused
                    ? "rgba(255,255,255,0.25)"
                    : theme.colors.textSecondary + "15",
                },
              ]}
            >
              <MaterialIcons
                name="search"
                size={16}
                color={searchFocused ? "#fff" : theme.colors.textSecondary}
              />
            </View>
            <TextInput
              style={[
                styles.searchInput,
                { color: searchFocused ? "#fff" : theme.colors.textPrimary },
              ]}
              placeholder={t("groupCreation.searchLeaguesPlaceholder")}
              placeholderTextColor={
                searchFocused ? "rgba(255,255,255,0.7)" : theme.colors.textSecondary
              }
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              autoCapitalize="none"
              autoCorrect={false}
              multiline={false}
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={() => setSearchQuery("")}
                style={styles.clearButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons
                  name="close"
                  size={18}
                  color={searchFocused ? "#fff" : theme.colors.textSecondary}
                />
              </Pressable>
            )}
          </View>
        </View>

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
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderBottomWidth: 3,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 3,
  },
  searchIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginEnd: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    padding: 0,
    minHeight: 24,
    maxHeight: 24,
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
  listContainer: {
    paddingHorizontal: 0,
  },
});
