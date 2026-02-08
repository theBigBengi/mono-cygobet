// app/profile/groups.tsx
// Full list of user's groups with filter tabs.

import React, { useState, useMemo } from "react";
import { View, StyleSheet, FlatList, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Screen, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth/useAuth";
import { useUserStatsQuery } from "@/domains/profile";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";
import { GroupCompactCard } from "@/features/profile";
import { MaterialIcons } from "@expo/vector-icons";
import type { ApiUserGroupStat } from "@repo/types";

type FilterType = "all" | "active" | "ended";

export default function AllGroupsScreen() {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [filter, setFilter] = useState<FilterType>("all");

  const statsQuery = useUserStatsQuery(user?.id ?? 0);

  const groups = statsQuery.data?.data?.groups ?? [];

  const filteredGroups = useMemo(() => {
    let result = [...groups];

    if (filter === "active") {
      result = result.filter((g) => g.groupStatus === "active");
    } else if (filter === "ended") {
      result = result.filter((g) => g.groupStatus !== "active");
    }

    return result.sort((a, b) => {
      const aActive = a.groupStatus === "active";
      const bActive = b.groupStatus === "active";
      if (aActive !== bActive) return aActive ? -1 : 1;
      return b.totalPoints - a.totalPoints;
    });
  }, [groups, filter]);

  const handleGroupPress = (groupId: number) => {
    router.push(`/groups/${groupId}` as any);
  };

  if (statsQuery.isLoading) {
    return (
      <Screen>
        <QueryLoadingView message={t("profile.loadingStats")} />
      </Screen>
    );
  }

  if (statsQuery.isError) {
    return (
      <Screen>
        <QueryErrorView
          message={t("profile.failedLoadStats")}
          onRetry={() => void statsQuery.refetch()}
        />
      </Screen>
    );
  }

  const filterTabs: { key: FilterType; label: string }[] = [
    { key: "all", label: t("profile.filterAll") },
    { key: "active", label: t("profile.filterActive") },
    { key: "ended", label: t("profile.filterEnded") },
  ];

  const renderItem = ({ item }: { item: ApiUserGroupStat }) => (
    <GroupCompactCard
      groupId={item.groupId}
      groupName={item.groupName}
      rank={item.rank}
      totalPoints={item.totalPoints}
      status={item.groupStatus === "active" ? "active" : "ended"}
      onPress={() => handleGroupPress(item.groupId)}
    />
  );

  return (
    <Screen contentContainerStyle={[styles.screenContent, { padding: 0 }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={theme.colors.textPrimary}
          />
        </Pressable>
        <AppText variant="subtitle" style={styles.title}>
          {t("profile.allGroups")}
        </AppText>
        <View style={styles.headerSpacer} />
      </View>

      {/* Filter tabs */}
      <View style={styles.tabs}>
        {filterTabs.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setFilter(tab.key)}
            style={[
              styles.tab,
              {
                backgroundColor:
                  filter === tab.key
                    ? theme.colors.primary
                    : theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <AppText
              variant="body"
              style={{
                color:
                  filter === tab.key
                    ? theme.colors.primaryText
                    : theme.colors.textPrimary,
                fontWeight: filter === tab.key ? "600" : "400",
              }}
            >
              {tab.label}
            </AppText>
          </Pressable>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={filteredGroups}
        keyExtractor={(item) => String(item.groupId)}
        renderItem={renderItem}
        style={styles.flatList}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <AppText variant="body" color="secondary" style={styles.empty}>
            {t("groups.noGroupsYet")}
          </AppText>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flex: 1,
    alignItems: "stretch",
    justifyContent: "flex-start",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontWeight: "600",
  },
  headerSpacer: {
    width: 24,
  },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  flatList: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  empty: {
    textAlign: "center",
    paddingVertical: 32,
  },
});
