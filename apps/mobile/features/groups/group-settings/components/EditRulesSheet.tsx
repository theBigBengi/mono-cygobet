// features/groups/group-settings/components/EditRulesSheet.tsx
// Bottom sheet for editing scoring rules - only before first game starts.

import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { BottomSheetModal, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { useTranslation } from "react-i18next";
import { AppText, Button } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { SettingsRowBottomSheet } from "@/features/settings";
import type { ApiGroupItem, ApiUpdateGroupBody, ApiGroupResponse } from "@repo/types";
import type { UseMutationResult } from "@tanstack/react-query";
import type { ApiError } from "@/lib/http/apiError";

interface EditRulesSheetProps {
  sheetRef: React.RefObject<React.ComponentRef<typeof BottomSheetModal> | null>;
  group: ApiGroupItem | null;
  updateGroupMutation: UseMutationResult<
    ApiGroupResponse,
    ApiError,
    ApiUpdateGroupBody
  >;
}

export function EditRulesSheet({
  sheetRef,
  group,
  updateGroupMutation,
}: EditRulesSheetProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const [onTheNose, setOnTheNose] = useState("3");
  const [correctDiff, setCorrectDiff] = useState("2");
  const [outcome, setOutcome] = useState("1");

  // Reset when group changes
  useEffect(() => {
    if (group) {
      setOnTheNose(String(group.onTheNosePoints ?? 3));
      setCorrectDiff(String(group.correctDifferencePoints ?? 2));
      setOutcome(String(group.outcomePoints ?? 1));
    }
  }, [group?.onTheNosePoints, group?.correctDifferencePoints, group?.outcomePoints]);

  const handleSave = useCallback(() => {
    const o = parseInt(onTheNose, 10);
    const c = parseInt(correctDiff, 10);
    const u = parseInt(outcome, 10);

    if (isNaN(o) || isNaN(c) || isNaN(u) || o < 0 || c < 0 || u < 0) {
      Alert.alert(t("errors.error"), t("groupSettings.invalidPoints"));
      return;
    }

    // Check if anything changed
    const currentO = group?.onTheNosePoints ?? 3;
    const currentC = group?.correctDifferencePoints ?? 2;
    const currentU = group?.outcomePoints ?? 1;

    if (o === currentO && c === currentC && u === currentU) {
      sheetRef.current?.dismiss();
      return;
    }

    updateGroupMutation.mutate(
      {
        onTheNosePoints: o,
        correctDifferencePoints: c,
        outcomePoints: u,
      },
      {
        onSuccess: () => sheetRef.current?.dismiss(),
        onError: (error) => {
          Alert.alert(
            t("errors.error"),
            error?.message || t("editProfile.updateFailed")
          );
        },
      }
    );
  }, [onTheNose, correctDiff, outcome, group, updateGroupMutation, sheetRef, t]);

  if (!group) return null;

  return (
    <SettingsRowBottomSheet.Sheet
      sheetRef={sheetRef}
      title={t("groupSettings.editRules" as Parameters<typeof t>[0])}
    >
      <View style={styles.content}>
        <View style={styles.inputRow}>
          <AppText variant="body" style={styles.label}>
            {t("lobby.onTheNose")}
          </AppText>
          <BottomSheetTextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.textPrimary,
              },
            ]}
            value={onTheNose}
            onChangeText={setOnTheNose}
            keyboardType="number-pad"
          />
        </View>

        <View style={styles.inputRow}>
          <AppText variant="body" style={styles.label}>
            {t("lobby.goalPointDifference")}
          </AppText>
          <BottomSheetTextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.textPrimary,
              },
            ]}
            value={correctDiff}
            onChangeText={setCorrectDiff}
            keyboardType="number-pad"
          />
        </View>

        <View style={styles.inputRow}>
          <AppText variant="body" style={styles.label}>
            {t("lobby.outcome")}
          </AppText>
          <BottomSheetTextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.textPrimary,
              },
            ]}
            value={outcome}
            onChangeText={setOutcome}
            keyboardType="number-pad"
          />
        </View>

        <Button
          label={
            updateGroupMutation.isPending
              ? t("common.loading")
              : t("editProfile.save")
          }
          onPress={handleSave}
          disabled={updateGroupMutation.isPending}
          style={{ marginTop: theme.spacing.md }}
        />
      </View>
    </SettingsRowBottomSheet.Sheet>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    flex: 1,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    width: 80,
    textAlign: "center",
  },
});
