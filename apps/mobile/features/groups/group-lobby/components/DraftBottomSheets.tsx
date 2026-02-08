// features/groups/group-lobby/components/DraftBottomSheets.tsx
// All BottomSheet modals for the draft lobby screen, rendered outside ScrollView.

import React from "react";
import { useTranslation } from "react-i18next";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { SettingsRowBottomSheet } from "@/features/settings";
import { DraftScoringContent } from "./DraftScoringContent";
import type { DraftScoringValues } from "./DraftScoringContent";

type PredictionMode = "result" | "3way";
type KORoundMode = "90min" | "extraTime" | "penalties";

interface DraftBottomSheetsProps {
  predictionSheetRef: React.RefObject<React.ComponentRef<typeof BottomSheetModal> | null>;
  scoringSheetRef: React.RefObject<React.ComponentRef<typeof BottomSheetModal> | null>;
  koSheetRef: React.RefObject<React.ComponentRef<typeof BottomSheetModal> | null>;
  maxMembersSheetRef: React.RefObject<React.ComponentRef<typeof BottomSheetModal> | null>;
  predictionMode: PredictionMode;
  onPredictionModeChange: (mode: PredictionMode) => void;
  scoringValues: DraftScoringValues;
  onScoringChange: (values: DraftScoringValues) => void;
  koRoundMode: KORoundMode;
  onKORoundModeChange: (mode: KORoundMode) => void;
  maxMembers: number;
  onMaxMembersChange: (value: number) => void;
  isEditable: boolean;
}

export function DraftBottomSheets({
  predictionSheetRef,
  scoringSheetRef,
  koSheetRef,
  maxMembersSheetRef,
  predictionMode,
  onPredictionModeChange,
  scoringValues,
  onScoringChange,
  koRoundMode,
  onKORoundModeChange,
  maxMembers,
  onMaxMembersChange,
  isEditable,
}: DraftBottomSheetsProps) {
  const { t } = useTranslation("common");

  return (
    <>
      <SettingsRowBottomSheet.Sheet<PredictionMode>
        sheetRef={predictionSheetRef}
        title={t("lobby.predictionMode")}
        options={[
          { value: "result", label: t("lobby.exactResult") },
          { value: "3way", label: t("lobby.matchWinner") },
        ]}
        value={predictionMode}
        onValueChange={onPredictionModeChange}
      />
      <SettingsRowBottomSheet.Sheet
        sheetRef={scoringSheetRef}
        title={t("lobby.scoring")}
        children={
          <DraftScoringContent
            values={scoringValues}
            predictionMode={predictionMode}
            onChange={onScoringChange}
            disabled={!isEditable}
          />
        }
      />
      <SettingsRowBottomSheet.Sheet<KORoundMode>
        sheetRef={koSheetRef}
        title={t("lobby.koRoundMode")}
        options={[
          { value: "90min", label: t("lobby.90min") },
          { value: "extraTime", label: t("lobby.extraTime") },
          { value: "penalties", label: t("lobby.penalties") },
        ]}
        value={koRoundMode}
        onValueChange={onKORoundModeChange}
      />
      <SettingsRowBottomSheet.Sheet
        sheetRef={maxMembersSheetRef}
        title={t("lobby.maxMembers")}
        options={[
          { value: "10", label: "10" },
          { value: "20", label: "20" },
          { value: "30", label: "30" },
          { value: "50", label: "50" },
          { value: "100", label: "100" },
        ]}
        value={String(maxMembers)}
        onValueChange={(v) => onMaxMembersChange(Number(v))}
      />
    </>
  );
}
