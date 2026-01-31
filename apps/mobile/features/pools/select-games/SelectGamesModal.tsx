// features/pools/select-games/SelectGamesModal.tsx
// Select Games Modal - Bottom Sheet Wizard.
// - Step 1: Choose selection mode (games/leagues/teams)
// - Step 2: Select items based on mode
// - No navigation, pure modal with internal state.

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText, Button, Card } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import type { Theme } from "@/lib/theme/theme.types";

type SelectionMode = "games" | "leagues" | "teams" | null;
type FlowStep = 1 | 2;

interface SelectGamesModalProps {
  visible: boolean;
  onRequestClose: () => void;
  poolId: number;
}

// Mock data
interface MockGame {
  id: number;
  homeTeam: string;
  awayTeam: string;
  date: string;
  time: string;
}

interface MockLeague {
  id: number;
  name: string;
  country: string;
}

interface MockTeam {
  id: number;
  name: string;
  country: string;
}

const MOCK_GAMES: MockGame[] = [
  {
    id: 1,
    homeTeam: "Manchester United",
    awayTeam: "Liverpool",
    date: "2026-01-20",
    time: "15:00",
  },
  {
    id: 2,
    homeTeam: "Arsenal",
    awayTeam: "Chelsea",
    date: "2026-01-20",
    time: "17:30",
  },
  {
    id: 3,
    homeTeam: "Barcelona",
    awayTeam: "Real Madrid",
    date: "2026-01-21",
    time: "20:00",
  },
  {
    id: 4,
    homeTeam: "Bayern Munich",
    awayTeam: "Borussia Dortmund",
    date: "2026-01-21",
    time: "18:00",
  },
  {
    id: 5,
    homeTeam: "PSG",
    awayTeam: "Marseille",
    date: "2026-01-22",
    time: "21:00",
  },
];

const MOCK_LEAGUES: MockLeague[] = [
  { id: 1, name: "Premier League", country: "England" },
  { id: 2, name: "La Liga", country: "Spain" },
  { id: 3, name: "Bundesliga", country: "Germany" },
  { id: 4, name: "Serie A", country: "Italy" },
  { id: 5, name: "Ligue 1", country: "France" },
  { id: 6, name: "Champions League", country: "Europe" },
];

const MOCK_TEAMS: MockTeam[] = [
  { id: 1, name: "Manchester United", country: "England" },
  { id: 2, name: "Liverpool", country: "England" },
  { id: 3, name: "Barcelona", country: "Spain" },
  { id: 4, name: "Real Madrid", country: "Spain" },
  { id: 5, name: "Bayern Munich", country: "Germany" },
  { id: 6, name: "PSG", country: "France" },
  { id: 7, name: "Juventus", country: "Italy" },
  { id: 8, name: "Arsenal", country: "England" },
];

export function SelectGamesModal({
  visible,
  onRequestClose,
  poolId,
}: SelectGamesModalProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // Wizard state
  const [step, setStep] = useState<FlowStep>(1);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (!visible) {
      setStep(1);
      setSelectionMode(null);
      setSelectedIds(new Set());
    }
  }, [visible]);

  function handleCancel() {
    onRequestClose();
  }

  function handleBack() {
    // Go back to step 1, reset selections
    setStep(1);
    setSelectionMode(null);
    setSelectedIds(new Set());
  }

  function handleSelectMode(mode: SelectionMode) {
    setSelectionMode(mode);
    setStep(2);
    setSelectedIds(new Set());
  }

  function toggleSelection(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleSave() {
    console.log({
      poolId,
      selectionMode,
      selectedIds: Array.from(selectedIds),
    });
    onRequestClose();
  }

  const hasSelection = selectedIds.size > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleCancel}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.background,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <View
          style={[
            styles.contentWrapper,
            {
              backgroundColor: theme.colors.background,
            },
          ]}
        >
              {/* Header */}
              <View
                style={[
                  styles.header,
                  {
                    borderBottomColor: theme.colors.border,
                  },
                ]}
              >
                <View style={styles.headerLeft}>
                  {step === 1 ? (
                    <Pressable onPress={handleCancel}>
                      <AppText variant="body" color="primary">
                        Cancel
                      </AppText>
                    </Pressable>
                  ) : (
                    <Pressable onPress={handleBack}>
                      <AppText variant="body" color="primary">
                        {t("pool.back")}
                      </AppText>
                    </Pressable>
                  )}
                </View>
                <View style={styles.headerCenter}>
                  <AppText variant="subtitle">{t("pool.selectGames")}</AppText>
                </View>
                <View style={styles.headerRight} />
              </View>

              {/* Content */}
              <View style={styles.content}>
                {step === 1 ? (
                  <View style={styles.modeContainer}>
                    <AppText variant="title" style={styles.title}>
                      {t("pool.howToSelect")}
                    </AppText>

                    <View style={styles.optionsContainer}>
                      <Pressable onPress={() => handleSelectMode("games")}>
                        <Card style={styles.optionCard}>
                          <View style={styles.optionContent}>
                            <AppText variant="body" style={styles.optionTitle}>
                              {t("pool.byUpcomingGames")}
                            </AppText>
                            <AppText
                              variant="caption"
                              color="secondary"
                              style={styles.optionSubtitle}
                            >
                              {t("pool.byUpcomingGamesSubtitle")}
                            </AppText>
                          </View>
                        </Card>
                      </Pressable>

                      <Pressable onPress={() => handleSelectMode("leagues")}>
                        <Card style={styles.optionCard}>
                          <View style={styles.optionContent}>
                            <AppText variant="body" style={styles.optionTitle}>
                              {t("pool.byLeagues")}
                            </AppText>
                            <AppText
                              variant="caption"
                              color="secondary"
                              style={styles.optionSubtitle}
                            >
                              {t("pool.byLeaguesSubtitle")}
                            </AppText>
                          </View>
                        </Card>
                      </Pressable>

                      <Pressable onPress={() => handleSelectMode("teams")}>
                        <Card style={styles.optionCard}>
                          <View style={styles.optionContent}>
                            <AppText variant="body" style={styles.optionTitle}>
                              {t("pool.byTeams")}
                            </AppText>
                            <AppText
                              variant="caption"
                              color="secondary"
                              style={styles.optionSubtitle}
                            >
                              {t("pool.byTeamsSubtitle")}
                            </AppText>
                          </View>
                        </Card>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <FlatList
                    data={
                      selectionMode === "games"
                        ? MOCK_GAMES
                        : selectionMode === "leagues"
                        ? MOCK_LEAGUES
                        : MOCK_TEAMS
                    }
                    renderItem={({ item }) => {
                      const itemId = item.id;
                      const isSelected = selectedIds.has(itemId);

                      return (
                        <Pressable onPress={() => toggleSelection(itemId)}>
                          <Card style={styles.itemCard}>
                            <View style={styles.itemContent}>
                              <View style={styles.itemInfo}>
                                {selectionMode === "games" && (
                                  <>
                                    <AppText variant="body" style={styles.itemTitle}>
                                      {(item as MockGame).homeTeam}
                                    </AppText>
                                    <AppText
                                      variant="caption"
                                      color="secondary"
                                      style={styles.vsText}
                                    >
                                      vs
                                    </AppText>
                                    <AppText variant="body" style={styles.itemTitle}>
                                      {(item as MockGame).awayTeam}
                                    </AppText>
                                    <AppText
                                      variant="caption"
                                      color="secondary"
                                      style={styles.dateText}
                                    >
                                      {(item as MockGame).date} • {(item as MockGame).time}
                                    </AppText>
                                  </>
                                )}
                                {(selectionMode === "leagues" ||
                                  selectionMode === "teams") && (
                                  <>
                                    <AppText variant="body" style={styles.itemTitle}>
                                      {(item as MockLeague | MockTeam).name}
                                    </AppText>
                                    <AppText
                                      variant="caption"
                                      color="secondary"
                                      style={styles.countryText}
                                    >
                                      {(item as MockLeague | MockTeam).country}
                                    </AppText>
                                  </>
                                )}
                              </View>
                              <Checkbox isSelected={isSelected} theme={theme} />
                            </View>
                          </Card>
                        </Pressable>
                      );
                    }}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={[
                      styles.listContent,
                      { paddingBottom: hasSelection ? 80 : 16 },
                    ]}
                    style={styles.list}
                  />
                )}
              </View>

              {/* Footer - Save button (only in step 2) */}
              {step === 2 && hasSelection && (
                <View
                  style={[
                    styles.footer,
                    {
                      backgroundColor: theme.colors.background,
                      borderTopColor: theme.colors.border,
                    },
                  ]}
                >
                  <Button
                    label={t("pool.saveSelection")}
                    onPress={handleSave}
                    style={styles.saveButton}
                  />
                </View>
              )}
        </View>
      </View>
    </Modal>
  );
}

interface CheckboxProps {
  isSelected: boolean;
  theme: Theme;
}

function Checkbox({ isSelected, theme }: CheckboxProps) {
  return (
    <View
      style={[
        styles.checkbox,
        {
          backgroundColor: isSelected
            ? theme.colors.primary
            : theme.colors.surface,
          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
        },
      ]}
    >
      {isSelected && (
        <View
          style={[
            styles.checkmark,
            { backgroundColor: theme.colors.primaryText },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    width: 80,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerRight: {
    width: 80,
  },
  content: {
    flex: 1,
  },
  modeContainer: {
    padding: 16,
  },
  title: {
    marginBottom: 24,
    fontWeight: "700",
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    marginBottom: 0,
  },
  optionContent: {
    gap: 4,
  },
  optionTitle: {
    fontWeight: "600",
    marginBottom: 4,
  },
  optionSubtitle: {
    marginTop: 0,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  itemCard: {
    marginBottom: 0,
  },
  itemContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  itemTitle: {
    fontWeight: "600",
  },
  vsText: {
    marginVertical: 2,
  },
  dateText: {
    marginTop: 4,
  },
  countryText: {
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  checkmark: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  saveButton: {
    width: "100%",
  },
});
