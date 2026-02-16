// features/groups/predictions/components/VerticalTimelineWrapper.tsx
// Wraps fixture cards with a vertical timeline indicator on the left side.

import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { isFinished as isFinishedState, isCancelled as isCancelledState } from "@repo/utils";
import { formatKickoffTime, formatKickoffDate } from "@/utils/fixture";
import type { FixtureItem } from "@/types/common";

type TimelineType = "success" | "missed" | "waiting" | "upcoming" | "cancelled";

interface VerticalTimelineWrapperProps {
  fixture: FixtureItem;
  isFirst: boolean;
  isLast: boolean;
  /** Whether the next fixture in the list is also finished */
  isNextFinished?: boolean;
  /** Whether this fixture is highlighted (scrolled to) */
  isHighlighted?: boolean;
  children: React.ReactNode;
}

function getTimelineType(fixture: FixtureItem): TimelineType {
  const prediction = fixture.prediction;
  const hasPrediction = Boolean(
    prediction && prediction.home != null && prediction.away != null
  );
  const hasPoints = Boolean(prediction?.points != null && prediction.points > 0);
  const isFinished = isFinishedState(fixture.state);
  const isCancelled = isCancelledState(fixture.state);

  if (isCancelled) {
    return "cancelled";
  }
  if (isFinished) {
    return hasPoints ? "success" : "missed";
  }
  return hasPrediction ? "waiting" : "upcoming";
}

const DOT_SIZE = 16;
const LINE_WIDTH = 2;
const LINE_EXTENSION = 40;
const TIMELINE_WIDTH = 56;
const CHEVRON_WIDTH = 32;
const PROGRESS_LINE_COLOR = "#9CA3AF";

export function VerticalTimelineWrapper({
  fixture,
  isFirst,
  isLast,
  isNextFinished,
  isHighlighted,
  children,
}: VerticalTimelineWrapperProps) {
  const { theme } = useTheme();
  const type = getTimelineType(fixture);

  const getBackgroundColor = () => {
    switch (type) {
      case "success":
        return theme.colors.primary;
      case "missed":
        return theme.colors.primary;
      case "waiting":
        return theme.colors.border;
      case "upcoming":
        return theme.colors.background;
      case "cancelled":
        return theme.colors.primary;
    }
  };

  const getIcon = (): { name: string; color: string } | null => {
    switch (type) {
      case "success":
        return { name: "checkmark-sharp", color: theme.colors.primaryText };
      case "missed":
        return { name: "close-sharp", color: theme.colors.primaryText };
      case "waiting":
        return { name: "help-sharp", color: theme.colors.textSecondary };
      case "upcoming":
        return null;
      case "cancelled":
        return { name: "remove-sharp", color: theme.colors.primaryText };
    }
  };

  const isEmptyDot = type === "upcoming";
  const icon = getIcon();
  const isFinished = type === "success" || type === "missed" || type === "cancelled";
  const isCancelled = type === "cancelled";

  // Build the label: date+time for all, plus points for finished, status for cancelled
  const getLabel = (): { text: string; secondaryText?: string; thirdText?: string; thirdColor?: string } | null => {
    if (isCancelled) {
      // Short status: first 4 letters
      const shortStatus = fixture.state?.slice(0, 4).toUpperCase() ?? "CANC";
      return {
        text: shortStatus,
        secondaryText: undefined,
        thirdText: undefined,
        thirdColor: undefined,
      };
    }

    const baseLabel = {
      text: formatKickoffDate(fixture.kickoffAt),
      secondaryText: formatKickoffTime(fixture.kickoffAt),
    };

    if (isFinished) {
      const points = fixture.prediction?.points ?? 0;
      return {
        ...baseLabel,
        thirdText: points > 0 ? `+${points} pts` : "0 pts",
        thirdColor: theme.colors.primary,
      };
    }

    return baseLabel;
  };

  const label = getLabel();

  return (
    <View style={styles.container}>
      {/* Timeline column */}
      <View style={styles.timelineColumn}>
        {/* Background line - full timeline (border color) */}
        <View
          style={[
            styles.lineAbsolute,
            {
              backgroundColor: theme.colors.border,
              top: isFirst ? "50%" : -LINE_EXTENSION,
              bottom: isLast ? "50%" : -LINE_EXTENSION,
            },
          ]}
        />
        {/* Progress line UP - connects from previous finished game to this dot */}
        {isFinished && !isFirst && (
          <View
            style={[
              styles.lineAbsolute,
              {
                backgroundColor: PROGRESS_LINE_COLOR,
                top: -LINE_EXTENSION,
                bottom: "50%",
              },
            ]}
          />
        )}
        {/* Progress line DOWN - connects from this dot to next game (only if next is also finished) */}
        {isFinished && isNextFinished && (
          <View
            style={[
              styles.lineAbsolute,
              {
                backgroundColor: PROGRESS_LINE_COLOR,
                top: "50%",
                bottom: -LINE_EXTENSION,
              },
            ]}
          />
        )}

        {/* Content row: label + dot - centered */}
        <View style={styles.contentRow}>
          {label && (
            <View style={styles.labelContainer}>
              <AppText style={[styles.label, { color: theme.colors.textSecondary }]}>
                {label.text}
              </AppText>
              {label.secondaryText && (
                <AppText style={[styles.labelSecondary, { color: theme.colors.textSecondary }]}>
                  {label.secondaryText}
                </AppText>
              )}
              {label.thirdText && (
                <AppText style={[styles.labelPoints, { color: label.thirdColor }]}>
                  {label.thirdText}
                </AppText>
              )}
            </View>
          )}
          <View
            style={[
              styles.dot,
              {
                backgroundColor: getBackgroundColor(),
                borderWidth: isEmptyDot ? 2 : 0,
                borderColor: theme.colors.border,
              },
            ]}
          >
            {icon && (
              <Ionicons
                name={icon.name as any}
                size={DOT_SIZE - 4}
                color={icon.color}
              />
            )}
          </View>
        </View>
      </View>

      {/* Card content */}
      <View
        style={[
          styles.cardContainer,
          isHighlighted && {
            backgroundColor: theme.colors.primary + "15",
            borderRadius: 8,
            marginRight: -8,
            paddingRight: 8,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    overflow: "visible",
  },
  timelineColumn: {
    width: TIMELINE_WIDTH,
    alignItems: "flex-end",
    justifyContent: "center",
    overflow: "visible",
    paddingLeft: 2,
    paddingRight: 6,
  },
  lineAbsolute: {
    position: "absolute",
    width: LINE_WIDTH,
    right: 6 + DOT_SIZE / 2 - LINE_WIDTH / 2,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    zIndex: 10,
  },
  labelContainer: {
    alignItems: "center",
  },
  label: {
    fontSize: 10,
    fontWeight: "500",
    lineHeight: 12,
  },
  labelSecondary: {
    fontSize: 10,
    fontWeight: "400",
    lineHeight: 12,
  },
  labelPoints: {
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 14,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    elevation: 10,
  },
  cardContainer: {
    flex: 1,
  },
});
