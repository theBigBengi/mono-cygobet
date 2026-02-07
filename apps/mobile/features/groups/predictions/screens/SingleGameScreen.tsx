import React, { useRef, useState, useCallback, useEffect } from "react";
import { View, StyleSheet, Keyboard, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/lib/theme";
import { QueryLoadingView } from "@/components/QueryState/QueryLoadingView";
import { QueryErrorView } from "@/components/QueryState/QueryErrorView";
import { useTranslation } from "react-i18next";
import { GroupGamesHeader } from "../components/GroupGamesHeader";
import { GameSlider } from "../components/GameSlider";
import { SingleGameContent } from "../components/SingleGameContent";
import { useGroupFixture } from "../hooks/useGroupFixture";
import { useGroupPredictions } from "../hooks/useGroupPredictions";
import { SAVE_PENDING_DELAY_MS } from "../utils/constants";
import type { FocusedField, PredictionMode } from "../types";

export type SingleGameScreenProps = {
  groupId: number | null;
  fixtureId: number | null;
  predictionMode: PredictionMode;
};

/**
 * Dedicated screen for viewing/editing a single game prediction.
 * Reads from group query cache (no duplicate fetch). Supports optional
 * horizontal swipe to adjacent games via GameSlider (Phase 5).
 */
export function SingleGameScreen({
  groupId,
  fixtureId,
  predictionMode,
}: SingleGameScreenProps) {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { theme } = useTheme();

  const { fixture, allFixtures, isLoading, error } = useGroupFixture(
    groupId,
    fixtureId
  );

  const {
    getPrediction,
    isPredictionSaved,
    updatePrediction,
    updateSliderValue,
    setOutcomePrediction,
    saveAllPending,
  } = useGroupPredictions({
    groupId,
    predictionMode,
  });

  const [currentFixtureId, setCurrentFixtureId] = useState<number | null>(
    fixtureId
  );
  const [currentFocusedField, setCurrentFocusedField] =
    useState<FocusedField>(null);
  const homeRef = useRef<TextInput | null>(null);
  const awayRef = useRef<TextInput | null>(null);

  useEffect(() => {
    setCurrentFixtureId(fixtureId);
  }, [fixtureId]);

  const currentFixture =
    allFixtures.find((f) => f.id === currentFixtureId) ?? fixture ?? null;
  const currentFixtureIndex =
    currentFixtureId != null
      ? allFixtures.findIndex((f) => f.id === currentFixtureId)
      : -1;

  const prediction =
    currentFixtureId != null
      ? getPrediction(currentFixtureId)
      : { home: null, away: null };
  const isSaved =
    currentFixtureId != null ? isPredictionSaved(currentFixtureId) : false;

  const handleFieldFocus = useCallback((fId: number, type: "home" | "away") => {
    setCurrentFocusedField({ fixtureId: fId, type });
  }, []);
  const handleFieldBlur = useCallback(() => {
    setCurrentFocusedField(null);
  }, []);

  const getNextFieldIndex = useCallback(
    (_fId: number, type: "home" | "away") => {
      return type === "home" ? 1 : -1;
    },
    []
  );
  const navigateToField = useCallback((index: number) => {
    if (index === 0) {
      homeRef.current?.focus?.();
    } else if (index === 1) {
      awayRef.current?.focus?.();
    }
  }, []);

  const handleSelectOutcome = useCallback(
    (fId: number, outcome: "home" | "draw" | "away") => {
      setOutcomePrediction(fId, outcome);
      setTimeout(() => saveAllPending(), SAVE_PENDING_DELAY_MS);
    },
    [setOutcomePrediction, saveAllPending]
  );

  useEffect(() => {
    const listener = Keyboard.addListener("keyboardDidHide", () => {
      saveAllPending();
    });
    return () => listener.remove();
  }, [saveAllPending]);

  const handleSelectGame = useCallback(
    (index: number) => {
      const f = allFixtures[index];
      if (f) {
        setCurrentFixtureId(f.id);
        router.setParams({ fixtureId: String(f.id) });
        Keyboard.dismiss();
        saveAllPending();
      }
    },
    [allFixtures, router, saveAllPending]
  );

  if (isLoading) {
    return <QueryLoadingView message={t("groups.loadingGroup")} />;
  }
  if (error) {
    return <QueryErrorView message={t("groups.failedLoadGroup")} />;
  }
  const showError = !fixture && fixtureId != null;
  if (showError || !fixture || !currentFixture) {
    if (showError) {
      return <QueryErrorView message={t("groups.failedLoadGroup")} />;
    }
    return null;
  }

  const isHomeFocused =
    currentFocusedField?.fixtureId === currentFixture.id &&
    currentFocusedField?.type === "home";
  const isAwayFocused =
    currentFocusedField?.fixtureId === currentFixture.id &&
    currentFocusedField?.type === "away";

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <GroupGamesHeader backOnly onBack={() => router.back()} />
      {allFixtures.length > 1 && (
        <GameSlider
          fixtures={allFixtures}
          currentIndex={currentFixtureIndex >= 0 ? currentFixtureIndex : 0}
          onSelectGame={handleSelectGame}
        />
      )}
      <View style={styles.content}>
        <SingleGameContent
          fixture={currentFixture}
          prediction={prediction}
          isSaved={isSaved}
          groupId={groupId}
          homeRef={homeRef}
          awayRef={awayRef}
          isHomeFocused={isHomeFocused}
          isAwayFocused={isAwayFocused}
          onFieldFocus={handleFieldFocus}
          onFieldBlur={handleFieldBlur}
          onUpdatePrediction={updatePrediction}
          onUpdateSliderValue={updateSliderValue}
          getNextFieldIndex={getNextFieldIndex}
          navigateToField={navigateToField}
          predictionMode={predictionMode}
          onSelectOutcome={
            predictionMode === "MatchWinner" ? handleSelectOutcome : undefined
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
