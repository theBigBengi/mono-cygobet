import React, { useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, Dimensions } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "@/components/ui";
import { SingleGameMatchCard } from "./SingleGameMatchCard";
import { GameDetailTabs } from "./GameDetailTabs";
import type { TabId } from "./GameDetailTabs";
import { HorizontalScoreSlider } from "./HorizontalScoreSlider";
import { FixturePredictionsList } from "./FixturePredictionsList";
import { MyPredictionsList } from "./MyPredictionsList";
import { getAwaySliderColor } from "../utils/color-helpers";
import { canPredict } from "@repo/utils";
import type { FixtureItem } from "@/types/common";
import type { GroupPrediction } from "@/features/group-creation/selection/games";
import type { PredictionMode } from "../types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export type SingleGameContentProps = {
  fixture: FixtureItem;
  prediction: GroupPrediction;
  isSaved: boolean;
  groupId: number | null;
  homeRef: React.RefObject<any> | undefined;
  awayRef: React.RefObject<any> | undefined;
  isHomeFocused: boolean;
  isAwayFocused: boolean;
  onFieldFocus: (fixtureId: number, type: "home" | "away") => void;
  onFieldBlur: (fixtureId: number) => void;
  onUpdatePrediction: (
    fixtureId: number,
    type: "home" | "away",
    text: string,
    onAutoNext?: (fixtureId: number, type: "home" | "away") => void
  ) => void;
  onUpdateSliderValue?: (
    fixtureId: number,
    side: "home" | "away",
    val: number | null
  ) => void;
  getNextFieldIndex: (fixtureId: number, type: "home" | "away") => number;
  navigateToField: (index: number) => void;
  predictionMode: PredictionMode;
  onSelectOutcome?: (
    fixtureId: number,
    outcome: "home" | "draw" | "away"
  ) => void;
};

/**
 * Single fixture prediction content: match card, tabs, sliders, predictions list.
 * Used by SingleGameScreen (dedicated route).
 */
export const SingleGameContent = React.memo(function SingleGameContent({
  fixture,
  prediction,
  isSaved,
  groupId,
  homeRef,
  awayRef,
  isHomeFocused,
  isAwayFocused,
  onFieldFocus,
  onFieldBlur,
  onUpdatePrediction,
  onUpdateSliderValue,
  getNextFieldIndex,
  navigateToField,
  predictionMode,
  onSelectOutcome,
}: SingleGameContentProps) {
  const { t } = useTranslation("common");

  const isEditable = canPredict(fixture.state, fixture.startTs);
  const defaultTab: TabId = isEditable ? "predict" : "predictions";
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);

  const tabs = [
    ...(isEditable
      ? [{ id: "predict" as const, label: t("predictions.predict") }]
      : []),
    ...(!isEditable
      ? [{ id: "predictions" as const, label: t("predictions.predictions") }]
      : []),
    { id: "statistics" as const, label: t("predictions.statistics") },
  ];

  const handleSliderChange = useCallback(
    (side: "home" | "away", val: number | null) => {
      if (onUpdateSliderValue) {
        onUpdateSliderValue(fixture.id, side, val);
      }
    },
    [fixture.id, onUpdateSliderValue]
  );

  return (
    <View style={[styles.gameContainer, { width: SCREEN_WIDTH }]}>
      <ScrollView
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.gameScrollContent}
      >
        <SingleGameMatchCard
          fixture={fixture}
          prediction={prediction}
          homeRef={homeRef}
          awayRef={awayRef}
          homeFocused={isHomeFocused}
          awayFocused={isAwayFocused}
          isSaved={isSaved}
          onFocus={(type) => onFieldFocus(fixture.id, type)}
          onBlur={() => onFieldBlur(fixture.id)}
          onChange={(type, text) => onUpdatePrediction(fixture.id, type, text)}
          onAutoNext={(type) => {
            const nextIndex = getNextFieldIndex(fixture.id, type);
            if (nextIndex >= 0) {
              navigateToField(nextIndex);
            }
          }}
          predictionMode={predictionMode}
          onSelectOutcome={
            onSelectOutcome
              ? (outcome) => onSelectOutcome(fixture.id, outcome)
              : undefined
          }
        />
        <GameDetailTabs
          tabs={tabs}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
        />
        {activeTab === "predict" && (
          <>
            <HorizontalScoreSlider
              side="home"
              value={prediction.home}
              onValueChange={(val) => handleSliderChange("home", val)}
              teamImagePath={fixture.homeTeam?.imagePath}
              teamName={fixture.homeTeam?.name}
              thumbColor={fixture.homeTeam?.firstKitColor ?? "#22C55E"}
            />
            <HorizontalScoreSlider
              side="away"
              value={prediction.away}
              onValueChange={(val) => handleSliderChange("away", val)}
              teamImagePath={fixture.awayTeam?.imagePath}
              teamName={fixture.awayTeam?.name}
              thumbColor={getAwaySliderColor(
                fixture.homeTeam?.firstKitColor,
                fixture.awayTeam?.secondKitColor,
                fixture.awayTeam?.thirdKitColor,
                "#3B82F6"
              )}
            />
            <MyPredictionsList
              fixtureId={fixture.id}
              currentGroupId={groupId}
            />
          </>
        )}
        {activeTab === "predictions" && (
          <FixturePredictionsList groupId={groupId} fixtureId={fixture.id} />
        )}
        {activeTab === "statistics" && (
          <View style={styles.placeholderContainer}>
            <AppText variant="body" color="secondary">
              {t("predictions.statistics")}
            </AppText>
          </View>
        )}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  gameContainer: {
    width: SCREEN_WIDTH,
    paddingHorizontal: 0,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  gameScrollContent: {
    paddingBottom: 24,
  },
  placeholderContainer: {
    padding: 16,
    alignItems: "center",
  },
});
