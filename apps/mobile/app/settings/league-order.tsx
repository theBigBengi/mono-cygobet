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
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { AppText, Button, TeamLogo } from "@/components/ui";
import { useTheme } from "@/lib/theme";
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
          <View
            style={[
              styles.selectedRow,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.orderBadge,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <AppText
                variant="caption"
                style={{ color: "#fff", fontWeight: "700" }}
              >
                {index + 1}
              </AppText>
            </View>
            <TeamLogo imagePath={item.imagePath} teamName={item.name} size={32} />
            <View style={styles.leagueInfo}>
              <AppText variant="body" numberOfLines={1} style={{ fontWeight: "500" }}>
                {item.name}
              </AppText>
              {item.countryName && (
                <AppText variant="caption" color="secondary" numberOfLines={1}>
                  {item.countryName}
                </AppText>
              )}
            </View>
            <View style={styles.actions}>
              <Pressable
                onPress={() => moveUp(index)}
                disabled={isFirst}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.actionButton,
                  { backgroundColor: theme.colors.background },
                  pressed && { opacity: 0.7 },
                  isFirst && { opacity: 0.3 },
                ]}
              >
                <Ionicons
                  name="chevron-up"
                  size={18}
                  color={theme.colors.textPrimary}
                />
              </Pressable>
              <Pressable
                onPress={() => moveDown(index)}
                disabled={isLast}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.actionButton,
                  { backgroundColor: theme.colors.background },
                  pressed && { opacity: 0.7 },
                  isLast && { opacity: 0.3 },
                ]}
              >
                <Ionicons
                  name="chevron-down"
                  size={18}
                  color={theme.colors.textPrimary}
                />
              </Pressable>
              <Pressable
                onPress={() => handleRemove(item.id)}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.actionButton,
                  { backgroundColor: theme.colors.danger + "15" },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Ionicons name="trash-outline" size={16} color={theme.colors.danger} />
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
            styles.availableRow,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
            pressed && { opacity: 0.7 },
          ]}
        >
          <TeamLogo imagePath={item.imagePath} teamName={item.name} size={32} />
          <View style={styles.leagueInfo}>
            <AppText variant="body" numberOfLines={1}>
              {item.name}
            </AppText>
            {item.countryName && (
              <AppText variant="caption" color="secondary" numberOfLines={1}>
                {item.countryName}
              </AppText>
            )}
          </View>
          <View
            style={[
              styles.addButton,
              { borderColor: theme.colors.primary },
            ]}
          >
            <Ionicons name="add" size={20} color={theme.colors.primary} />
          </View>
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
        <AppText variant="caption" color="secondary" style={{ fontWeight: "600" }}>
          {section.title.toUpperCase()}
        </AppText>
        {section.type === "selected" && selectedLeagues.length > 0 && (
          <Pressable onPress={handleReset} hitSlop={8}>
            <AppText variant="caption" color="secondary">
              {t("settings.leagueOrderScreen.resetToDefault")}
            </AppText>
          </Pressable>
        )}
      </View>
    ),
    [theme, selectedLeagues.length, handleReset, t]
  );

  if (isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={theme.colors.textPrimary} />
          </Pressable>
          <AppText variant="subtitle" style={{ fontWeight: "600" }}>
            {t("settings.leagueOrder")}
          </AppText>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={28} color={theme.colors.textPrimary} />
        </Pressable>
        <AppText variant="subtitle" style={{ fontWeight: "600" }}>
          {t("settings.leagueOrder")}
        </AppText>
        {hasChanges ? (
          <Pressable
            onPress={handleSave}
            disabled={updateMutation.isPending}
            hitSlop={8}
          >
            <AppText
              variant="body"
              style={{
                color: theme.colors.primary,
                fontWeight: "600",
              }}
            >
              {updateMutation.isPending
                ? t("common.loading")
                : t("common.save")}
            </AppText>
          </Pressable>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {/* Content */}
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
            <AppText
              variant="body"
              color="secondary"
              style={styles.emptyText}
            >
              {t("settings.leagueOrderScreen.noLeaguesConfigured")}
            </AppText>
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
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingTop: 20,
  },
  selectedRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  orderBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  availableRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  leagueInfo: {
    flex: 1,
  },
  actions: {
    flexDirection: "row",
    gap: 6,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    textAlign: "center",
  },
});
