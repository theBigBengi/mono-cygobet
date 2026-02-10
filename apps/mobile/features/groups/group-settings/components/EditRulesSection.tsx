// features/groups/group-settings/components/EditRulesSection.tsx
// Scoring rules section - editable only before first game starts.

import React, { useState, useEffect } from "react";
import { View, TextInput, StyleSheet, Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { SettingsSection } from "@/features/settings";
import { AppText, Button } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import type { ApiGroupItem } from "@repo/types";
import type { UseMutationResult } from "@tanstack/react-query";
import type { ApiGroupResponse } from "@repo/types";
import type { ApiError } from "@/lib/http/apiError";
import type { ApiUpdateGroupBody } from "@repo/types";

interface EditRulesSectionProps {
  group: ApiGroupItem | null;
  isCreator: boolean;
  updateGroupMutation: UseMutationResult<
    ApiGroupResponse,
    ApiError,
    ApiUpdateGroupBody
  >;
}

export function EditRulesSection({
  group,
  isCreator,
  updateGroupMutation,
}: EditRulesSectionProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const [onTheNose, setOnTheNose] = useState("3");
  const [correctDiff, setCorrectDiff] = useState("2");
  const [outcome, setOutcome] = useState("1");
  const [hasChanges, setHasChanges] = useState(false);

  const hasFirstGameStarted =
    group?.firstGame != null && group.firstGame.state !== "NS";

  useEffect(() => {
    if (group) {
      setOnTheNose(String(group.onTheNosePoints ?? 3));
      setCorrectDiff(String(group.correctDifferencePoints ?? 2));
      setOutcome(String(group.outcomePoints ?? 1));
    }
  }, [
    group?.onTheNosePoints,
    group?.correctDifferencePoints,
    group?.outcomePoints,
  ]);

  const checkChanges = () => {
    const o = parseInt(onTheNose, 10);
    const c = parseInt(correctDiff, 10);
    const u = parseInt(outcome, 10);
    const currentO = group?.onTheNosePoints ?? 3;
    const currentC = group?.correctDifferencePoints ?? 2;
    const currentU = group?.outcomePoints ?? 1;
    setHasChanges(
      !isNaN(o) &&
        !isNaN(c) &&
        !isNaN(u) &&
        (o !== currentO || c !== currentC || u !== currentU)
    );
  };

  useEffect(() => {
    checkChanges();
  }, [
    onTheNose,
    correctDiff,
    outcome,
    group?.onTheNosePoints,
    group?.correctDifferencePoints,
    group?.outcomePoints,
  ]);

  const handleSave = () => {
    const o = parseInt(onTheNose, 10);
    const c = parseInt(correctDiff, 10);
    const u = parseInt(outcome, 10);
    if (isNaN(o) || isNaN(c) || isNaN(u) || o < 0 || c < 0 || u < 0) {
      Alert.alert(
        t("errors.error"),
        "Please enter valid numbers (0 or greater)"
      );
      return;
    }

    updateGroupMutation.mutate(
      {
        onTheNosePoints: o,
        correctDifferencePoints: c,
        outcomePoints: u,
      },
      {
        onSuccess: () => setHasChanges(false),
        onError: (error) => {
          Alert.alert(
            t("errors.error"),
            error?.message || t("editProfile.updateFailed")
          );
        },
      }
    );
  };

  if (!isCreator || !group) return null;

  return (
    <SettingsSection
      title={t("groupSettings.editRules" as Parameters<typeof t>[0])}
    >
      {hasFirstGameStarted ? (
        <View
          style={[
            styles.lockedRow,
            {
              paddingVertical: theme.spacing.md,
              paddingHorizontal: theme.spacing.md,
            },
          ]}
        >
          <AppText variant="body" color="secondary">
            {t("groupSettings.rulesLocked" as Parameters<typeof t>[0])}
          </AppText>
          <View style={styles.valuesRow}>
            <AppText variant="caption" color="secondary">
              {group.onTheNosePoints ?? 3} /{" "}
              {group.correctDifferencePoints ?? 2} / {group.outcomePoints ?? 1}{" "}
              pts
            </AppText>
          </View>
        </View>
      ) : (
        <View style={[styles.editableContainer, { padding: theme.spacing.md }]}>
          <View style={styles.inputRow}>
            <AppText variant="caption" color="secondary" style={styles.label}>
              {t("lobby.onTheNose")}
            </AppText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.textPrimary,
                },
              ]}
              value={onTheNose}
              onChangeText={(v) => setOnTheNose(v)}
              keyboardType="number-pad"
            />
          </View>
          <View style={styles.inputRow}>
            <AppText variant="caption" color="secondary" style={styles.label}>
              {t("lobby.goalPointDifference")}
            </AppText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.textPrimary,
                },
              ]}
              value={correctDiff}
              onChangeText={(v) => setCorrectDiff(v)}
              keyboardType="number-pad"
            />
          </View>
          <View style={styles.inputRow}>
            <AppText variant="caption" color="secondary" style={styles.label}>
              {t("lobby.outcome")}
            </AppText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.textPrimary,
                },
              ]}
              value={outcome}
              onChangeText={(v) => setOutcome(v)}
              keyboardType="number-pad"
            />
          </View>
          {hasChanges && (
            <Button
              label={
                updateGroupMutation.isPending
                  ? t("common.loading")
                  : t("editProfile.save")
              }
              onPress={handleSave}
              disabled={updateGroupMutation.isPending}
              style={{ marginTop: theme.spacing.sm }}
            />
          )}
        </View>
      )}
    </SettingsSection>
  );
}

const styles = StyleSheet.create({
  lockedRow: {},
  valuesRow: {
    marginTop: 4,
  },
  editableContainer: {},
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  label: {
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    fontSize: 16,
    width: 70,
    textAlign: "center",
  },
});
