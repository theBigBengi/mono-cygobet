// features/group-creation/filters/FilterSheet.tsx

import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Pressable, TextInput } from "react-native";
import { CARD_BORDER_BOTTOM_WIDTH } from "@/lib/theme";
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetBackdrop,
  BottomSheetFooter,
  type BottomSheetBackdropProps,
  type BottomSheetFooterProps,
} from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AppText, Button, TeamLogo } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useLeaguesQuery } from "@/domains/leagues/leagues.hooks";
import { useDebounce } from "@/hooks/useDebounce";
import type { ApiLeagueItem } from "@repo/types";

/* ------------------------------------------------------------------ */

interface FilterSheetProps {
  sheetRef: React.RefObject<React.ComponentRef<typeof BottomSheetModal>>;
  selectedLeagueIds: number[];
  onApply: (leagueIds: number[]) => void;
  onClear: () => void;
}

/* ------------------------------------------------------------------ */

function orderSelected(leagues: ApiLeagueItem[], ids: number[]) {
  const byId = new Map(leagues.map((l) => [l.id, l]));
  const top: ApiLeagueItem[] = [];
  const rest: ApiLeagueItem[] = [];
  for (const id of ids) {
    const l = byId.get(id);
    if (l) top.push(l);
  }
  for (const l of leagues) {
    if (!ids.includes(l.id)) rest.push(l);
  }
  return [...top, ...rest];
}

/* ------------------------------------------------------------------ */

export function FilterSheet({
  sheetRef,
  selectedLeagueIds,
  onApply,
  onClear,
}: FilterSheetProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [localIds, setLocalIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 400);

  /* ---- data ---- */
  const qp = useMemo(
    () =>
      debounced.trim().length >= 3
        ? { search: debounced.trim(), page: 1 as const, perPage: 20 as const }
        : { preset: "popular" as const, page: 1 as const, perPage: 20 as const },
    [debounced]
  );
  const { data, isLoading, error } = useLeaguesQuery(qp);
  const leagues = useMemo(
    () => orderSelected(data?.data ?? [], localIds),
    [data?.data, localIds]
  );

  /* ---- bottom-sheet chrome ---- */
  const snapPoints = useMemo(() => ["85%"], []);

  const bgStyle = useMemo(
    () => ({
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
    }),
    [theme.colors.surface]
  );

  const renderBackdrop = useCallback(
    (p: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...p}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
      />
    ),
    []
  );

  const handleChange = useCallback(
    (i: number) => {
      if (i >= 0) {
        setLocalIds(selectedLeagueIds);
        setSearch("");
      }
    },
    [selectedLeagueIds]
  );

  /* ---- footer (always visible, rendered by library) ---- */
  const renderFooter = useCallback(
    (p: BottomSheetFooterProps) => (
      <BottomSheetFooter {...p} bottomInset={0}>
        <View
          style={[
            styles.footer,
            {
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.border,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <Button
            label={
              localIds.length > 0
                ? t("groupCreation.filtersApplyCount", {
                    count: localIds.length,
                  })
                : t("groupCreation.filtersApply")
            }
            onPress={() => onApply(localIds)}
          />
        </View>
      </BottomSheetFooter>
    ),
    [insets.bottom, theme, localIds, t, onApply]
  );

  /* ---- helpers ---- */
  const toggle = (id: number) =>
    setLocalIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const hasFilters = localIds.length > 0;

  /* ---- render ---- */
  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={bgStyle}
      handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary }}
      onChange={handleChange}
      footerComponent={renderFooter}
    >
      <BottomSheetScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <AppText variant="subtitle" style={styles.headerTitle}>
            {t("groupCreation.filtersLeaguesSection")}
          </AppText>
          {hasFilters && (
            <Pressable
              onPress={() => {
                setLocalIds([]);
                onClear();
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <AppText variant="body" color="primary" style={styles.clearText}>
                {t("groupCreation.filtersClear")}
              </AppText>
            </Pressable>
          )}
        </View>

        {/* Search */}
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.textPrimary }]}
            placeholder={t("groupCreation.searchLeaguesPlaceholder")}
            placeholderTextColor={theme.colors.textSecondary}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <Pressable
              onPress={() => setSearch("")}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
            </Pressable>
          )}
        </View>

        {/* States */}
        {isLoading && (
          <AppText variant="body" color="secondary" style={styles.msg}>
            {t("groupCreation.loadingLeagues")}
          </AppText>
        )}
        {error && (
          <AppText variant="body" color="danger" style={styles.msg}>
            {t("groupCreation.failedLoadLeagues")}
          </AppText>
        )}
        {!isLoading && !error && leagues.length === 0 && (
          <AppText variant="body" color="secondary" style={styles.msg}>
            {debounced.trim().length >= 3
              ? t("groupCreation.noLeaguesFound")
              : t("groupCreation.noPopularLeagues")}
          </AppText>
        )}

        {/* League rows */}
        {!isLoading &&
          !error &&
          leagues.map((item) => {
            const sel = localIds.includes(item.id);
            return (
              <Pressable
                key={item.id}
                onPress={() => toggle(item.id)}
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: sel
                      ? theme.colors.primary + "08"
                      : theme.colors.surface,
                    borderColor: sel
                      ? theme.colors.primary + "40"
                      : theme.colors.border,
                    borderBottomColor: sel
                      ? theme.colors.primary + "40"
                      : theme.colors.textSecondary + "30",
                    shadowColor: "#000",
                    shadowOpacity: pressed ? 0 : sel ? 0.15 : 0.08,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}
              >
                <View style={[styles.logo, { backgroundColor: theme.colors.textPrimary + "08" }]}>
                  <TeamLogo imagePath={item.imagePath} teamName={item.name} size={32} />
                </View>
                <View style={styles.nameWrap}>
                  <AppText
                    variant="body"
                    style={[
                      styles.name,
                      { color: sel ? theme.colors.primary : theme.colors.textPrimary },
                    ]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </AppText>
                  {item.country?.name && (
                    <AppText variant="caption" color="secondary" numberOfLines={1}>
                      {item.country.name}
                    </AppText>
                  )}
                </View>
                <Ionicons
                  name={sel ? "checkmark-circle" : "ellipse-outline"}
                  size={24}
                  color={sel ? theme.colors.primary : theme.colors.textSecondary}
                />
              </Pressable>
            );
          })}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 100, // space so last items aren't behind footer
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
    paddingBottom: 12,
  },
  headerTitle: { fontWeight: "700" },
  clearText: { fontWeight: "600" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 16, padding: 0 },
  msg: { paddingVertical: 16, textAlign: "center" },
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
    marginBottom: 6,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    // backgroundColor set inline with theme
    justifyContent: "center",
    alignItems: "center",
  },
  nameWrap: { flex: 1 },
  name: { fontSize: 14, fontWeight: "600" },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
  },
});
