// app/settings/league-order.tsx
// League order settings screen - allows users to customize the display order of leagues.

import React, { useCallback, useMemo, useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  SectionList,
  Text,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { AppText, TeamLogo } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  useLeaguePreferences,
  useUpdateLeaguePreferences,
  useResetLeaguePreferences,
} from "@/domains/preferences";
import { useLeaguesQuery } from "@/domains/leagues";
import type { ApiLeagueItem } from "@repo/types";

type LeagueItem = {
  id: number;
  name: string;
  imagePath: string | null;
  countryName: string | null;
};

export default function LeagueOrderScreen() {
  return (
    <ErrorBoundary feature="league-order">
      <LeagueOrderContent />
    </ErrorBoundary>
  );
}

function LeagueOrderContent() {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: prefsData, isLoading: prefsLoading } = useLeaguePreferences();
  const updateMutation = useUpdateLeaguePreferences();
  const resetMutation = useResetLeaguePreferences();

  const [selectedLeagues, setSelectedLeagues] = useState<LeagueItem[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch all leagues (not just popular) so admin-set leagues are available
  const { data: leaguesData, isLoading: leaguesLoading } = useLeaguesQuery({
    perPage: 100,
    includeCountry: true,
  });

  const allLeagues = useMemo(() => {
    return (leaguesData?.data ?? []).map((l) => ({
      id: l.id,
      name: l.name,
      imagePath: l.imagePath,
      countryName: l.country?.name ?? null,
    }));
  }, [leaguesData]);

  // Sync leagues when preferences load
  useEffect(() => {
    if (prefsData?.data?.leagueOrder && allLeagues.length > 0) {
      const leagueMap = new Map(allLeagues.map((l) => [l.id, l]));
      const orderedLeagues = prefsData.data.leagueOrder
        .map((id) => leagueMap.get(id))
        .filter((l): l is LeagueItem => l !== undefined);
      setSelectedLeagues(orderedLeagues);
      setHasChanges(false);
    }
  }, [prefsData?.data?.leagueOrder, allLeagues]);

  const selectedIds = useMemo(
    () => new Set(selectedLeagues.map((l) => l.id)),
    [selectedLeagues]
  );

  const availableLeagues = useMemo(
    () => allLeagues.filter((l) => !selectedIds.has(l.id)),
    [allLeagues, selectedIds]
  );

  const moveUp = useCallback((index: number) => {
    if (index <= 0) return;
    setSelectedLeagues((prev) => {
      const newArr = [...prev];
      [newArr[index - 1], newArr[index]] = [newArr[index], newArr[index - 1]];
      return newArr;
    });
    setHasChanges(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const moveDown = useCallback((index: number) => {
    setSelectedLeagues((prev) => {
      if (index >= prev.length - 1) return prev;
      const newArr = [...prev];
      [newArr[index], newArr[index + 1]] = [newArr[index + 1], newArr[index]];
      return newArr;
    });
    setHasChanges(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleRemove = useCallback((id: number) => {
    setSelectedLeagues((prev) => prev.filter((l) => l.id !== id));
    setHasChanges(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleAdd = useCallback((league: LeagueItem) => {
    setSelectedLeagues((prev) => [...prev, league]);
    setHasChanges(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleSave = useCallback(() => {
    const leagueIds = selectedLeagues.map((l) => l.id);
    updateMutation.mutate(leagueIds, {
      onSuccess: () => {
        setHasChanges(false);
        router.back();
      },
      onError: (error) => {
        Alert.alert(t("errors.error"), error.message);
      },
    });
  }, [selectedLeagues, updateMutation, t, router]);

  const handleReset = useCallback(() => {
    Alert.alert(
      t("settings.leagueOrderScreen.resetToDefault"),
      t("settings.leagueOrderScreen.resetConfirm"),
      [
        { text: t("settings.leagueOrderScreen.cancel"), style: "cancel" },
        {
          text: t("settings.leagueOrderScreen.reset"),
          style: "destructive",
          onPress: () => {
            resetMutation.mutate(undefined, {
              onSuccess: () => {
                setSelectedLeagues([]);
                setHasChanges(false);
              },
              onError: (error) => {
                Alert.alert(t("errors.error"), error.message);
              },
            });
          },
        },
      ]
    );
  }, [resetMutation, t]);

  const sections = useMemo(() => {
    const result = [];
    if (selectedLeagues.length > 0) {
      result.push({
        title: t("settings.leagueOrderScreen.yourOrder"),
        type: "selected" as const,
        data: selectedLeagues,
      });
    }
    if (availableLeagues.length > 0) {
      result.push({
        title: t("settings.leagueOrderScreen.availableLeagues"),
        type: "available" as const,
        data: availableLeagues,
      });
    }
    return result;
  }, [selectedLeagues, availableLeagues, t]);

  const isLoading = prefsLoading || leaguesLoading;

  const renderItem = useCallback(
    ({ item, index, section }: { item: LeagueItem; index: number; section: { type: string } }) => {
      if (section.type === "selected") {
        const isFirst = index === 0;
        const isLast = index === selectedLeagues.length - 1;

        return (
          <View style={styles.row}>
            <Text
              style={[
                styles.orderNumber,
                { color: theme.colors.primary },
              ]}
            >
              {index + 1}
            </Text>
            <TeamLogo imagePath={item.imagePath} teamName={item.name} size={28} />
            <View style={styles.leagueInfo}>
              <Text
                style={[styles.leagueName, { color: theme.colors.textPrimary }]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              {item.countryName && (
                <Text
                  style={[styles.leagueCountry, { color: theme.colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {item.countryName}
                </Text>
              )}
            </View>
            <View style={styles.actions}>
              <Pressable
                onPress={() => moveUp(index)}
                disabled={isFirst}
                hitSlop={8}
                style={({ pressed }) => [
                  { opacity: isFirst ? 0.25 : pressed ? 0.6 : 1 },
                ]}
              >
                <Ionicons
                  name="chevron-up"
                  size={18}
                  color={theme.colors.textSecondary}
                />
              </Pressable>
              <Pressable
                onPress={() => moveDown(index)}
                disabled={isLast}
                hitSlop={8}
                style={({ pressed }) => [
                  { opacity: isLast ? 0.25 : pressed ? 0.6 : 1 },
                ]}
              >
                <Ionicons
                  name="chevron-down"
                  size={18}
                  color={theme.colors.textSecondary}
                />
              </Pressable>
              <Pressable
                onPress={() => handleRemove(item.id)}
                hitSlop={8}
                style={({ pressed }) => [
                  { opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <Ionicons name="close" size={18} color={theme.colors.danger} />
              </Pressable>
            </View>
          </View>
        );
      }

      // Available league
      return (
        <Pressable
          onPress={() => handleAdd(item)}
          style={({ pressed }) => [
            styles.row,
            { opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <TeamLogo imagePath={item.imagePath} teamName={item.name} size={28} />
          <View style={styles.leagueInfo}>
            <Text
              style={[styles.leagueName, { color: theme.colors.textPrimary }]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            {item.countryName && (
              <Text
                style={[styles.leagueCountry, { color: theme.colors.textSecondary }]}
                numberOfLines={1}
              >
                {item.countryName}
              </Text>
            )}
          </View>
          <Ionicons name="add" size={20} color={theme.colors.primary} />
        </Pressable>
      );
    },
    [theme, selectedLeagues.length, moveUp, moveDown, handleRemove, handleAdd]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: { title: string; type: string } }) => (
      <View
        style={[
          styles.sectionHeader,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
          {section.title}
        </Text>
        {section.type === "selected" && selectedLeagues.length > 0 && (
          <Pressable
            onPress={handleReset}
            hitSlop={8}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
              {t("settings.leagueOrderScreen.resetToDefault")}
            </Text>
          </Pressable>
        )}
      </View>
    ),
    [theme, selectedLeagues.length, handleReset, t]
  );

  const renderHeader = (showSave: boolean) => (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <Pressable
        onPress={() => router.back()}
        style={styles.backButton}
        hitSlop={8}
      >
        <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
      </Pressable>
      <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
        {t("settings.leagueOrder")}
      </Text>
      {showSave ? (
        <Pressable
          onPress={handleSave}
          disabled={updateMutation.isPending}
          hitSlop={8}
          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={{ fontSize: 14, fontWeight: "600", color: theme.colors.primary }}>
            {updateMutation.isPending ? t("common.loading") : t("common.save")}
          </Text>
        </Pressable>
      ) : (
        <View style={styles.headerSpacer} />
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
        {renderHeader(false)}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      {renderHeader(hasChanges)}
      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 16 },
        ]}
        stickySectionHeadersEnabled
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="trophy-outline"
              size={48}
              color={theme.colors.textSecondary}
            />
            <Text style={{ fontSize: 14, color: theme.colors.textSecondary, textAlign: "center" }}>
              {t("settings.leagueOrderScreen.noLeaguesConfigured")}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  headerSpacer: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "500",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  orderNumber: {
    fontSize: 13,
    fontWeight: "700",
    width: 18,
    textAlign: "center",
  },
  leagueInfo: {
    flex: 1,
  },
  leagueName: {
    fontSize: 15,
  },
  leagueCountry: {
    fontSize: 11,
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
});
