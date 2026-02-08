import React from "react";
import { View, StyleSheet } from "react-native";
import { Card, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useTranslation } from "react-i18next";
import type { SkillRadarData } from "@repo/types";
import { InfoButton } from "./InfoButton";

interface SkillRadarChartProps {
  skills: SkillRadarData;
  onInfoPress?: () => void;
}

interface SkillBarProps {
  label: string;
  value: number;
  color: string;
  backgroundColor: string;
}

function SkillBar({ label, value, color, backgroundColor }: SkillBarProps) {
  return (
    <View style={styles.skillRow}>
      <AppText variant="caption" color="secondary" style={styles.skillLabel}>
        {label}
      </AppText>
      <View style={[styles.barContainer, { backgroundColor }]}>
        <View
          style={[
            styles.barFill,
            { width: `${value}%`, backgroundColor: color },
          ]}
        />
      </View>
      <AppText variant="caption" style={styles.skillValue}>
        {value}
      </AppText>
    </View>
  );
}

export function SkillRadarChart({ skills, onInfoPress }: SkillRadarChartProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  const skillsConfig = [
    {
      key: "accuracy",
      label: t("gamification.skillAccuracy"),
      value: skills.accuracy,
    },
    {
      key: "consistency",
      label: t("gamification.skillConsistency"),
      value: skills.consistency,
    },
    {
      key: "volume",
      label: t("gamification.skillVolume"),
      value: skills.volume,
    },
    {
      key: "exactScore",
      label: t("gamification.skillExact"),
      value: skills.exactScore,
    },
    {
      key: "timing",
      label: t("gamification.skillTiming"),
      value: skills.timing,
    },
  ];

  return (
    <Card>
      <View style={styles.titleRow}>
        <AppText variant="subtitle" style={styles.title}>
          {t("gamification.skillRadar")}
        </AppText>
        {onInfoPress && <InfoButton onPress={onInfoPress} />}
      </View>
      <View style={styles.skillsContainer}>
        {skillsConfig.map((skill) => (
          <SkillBar
            key={skill.key}
            label={skill.label}
            value={skill.value}
            color={theme.colors.primary}
            backgroundColor={theme.colors.border}
          />
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  title: {
    marginBottom: 16,
  },
  skillsContainer: {
    gap: 12,
  },
  skillRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  skillLabel: {
    minWidth: 80,
    flexShrink: 0,
  },
  barContainer: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
  },
  skillValue: {
    minWidth: 40,
    textAlign: "right",
    fontWeight: "600",
    flexShrink: 0,
  },
});
