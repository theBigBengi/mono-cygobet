import React from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/lib/theme";
import { AppText } from "@/components/ui";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const NODE_SIZE = 56;
const VERTICAL_GAP = 28;
const PATH_AMPLITUDE = SCREEN_WIDTH * 0.28; // how far left/right the path sways

// Mock data: 20 nodes going upward
const NODES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  points: (i + 1) * 50,
  completed: i < 12,
  current: i === 12,
}));

export default function JourneyScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation("common");
  const insets = useSafeAreaInsets();

  // Nodes ordered bottom-to-top for display (reversed so scroll starts at bottom)
  const nodesBottomUp = [...NODES].reverse();

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="default" />

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: theme.colors.background,
          },
        ]}
      >
        <AppText variant="title">{t("tabs.journey")}</AppText>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 120 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pathContainer}>
          {nodesBottomUp.map((node, index) => {
            // Serpentine path: sine wave pattern
            const reversedIndex = NODES.length - 1 - index;
            const xOffset =
              Math.sin(reversedIndex * 0.6) * PATH_AMPLITUDE;

            const isCompleted = node.completed;
            const isCurrent = node.current;
            const isLocked = !isCompleted && !isCurrent;

            // Colors
            const bgColor = isCompleted
              ? theme.colors.success
              : isCurrent
                ? theme.colors.primary
                : theme.colors.border;
            const textColor = isLocked
              ? theme.colors.textDisabled
              : "#FFFFFF";

            // Draw connector line to next node
            const showConnector = index < nodesBottomUp.length - 1;
            const nextReversedIndex = NODES.length - 2 - index;
            const nextXOffset =
              Math.sin(nextReversedIndex * 0.6) * PATH_AMPLITUDE;

            return (
              <View key={node.id} style={styles.nodeRow}>
                {/* Connector line */}
                {showConnector && (
                  <View
                    style={[
                      styles.connector,
                      {
                        left: SCREEN_WIDTH / 2 + xOffset,
                        width: Math.abs(nextXOffset - xOffset) + 4,
                        marginLeft:
                          Math.min(xOffset, nextXOffset) -
                          xOffset +
                          NODE_SIZE / 2 -
                          2,
                        backgroundColor: isCompleted
                          ? theme.colors.success + "60"
                          : theme.colors.border,
                      },
                    ]}
                  />
                )}

                {/* Node circle */}
                <View
                  style={[
                    styles.node,
                    {
                      width: isCurrent ? NODE_SIZE + 8 : NODE_SIZE,
                      height: isCurrent ? NODE_SIZE + 8 : NODE_SIZE,
                      borderRadius: (isCurrent ? NODE_SIZE + 8 : NODE_SIZE) / 2,
                      backgroundColor: bgColor,
                      left:
                        SCREEN_WIDTH / 2 +
                        xOffset -
                        (isCurrent ? NODE_SIZE + 8 : NODE_SIZE) / 2,
                      borderWidth: isCurrent ? 3 : 0,
                      borderColor: isCurrent
                        ? theme.colors.primary + "40"
                        : "transparent",
                      shadowColor: isCurrent ? theme.colors.primary : "#000",
                      shadowOpacity: isCurrent ? 0.4 : 0.1,
                      shadowRadius: isCurrent ? 12 : 4,
                      shadowOffset: { width: 0, height: isCurrent ? 4 : 2 },
                      elevation: isCurrent ? 8 : 2,
                    },
                  ]}
                >
                  {isCompleted ? (
                    <AppText style={[styles.checkmark, { color: textColor }]}>
                      ✓
                    </AppText>
                  ) : (
                    <AppText
                      variant="caption"
                      style={[
                        styles.nodeText,
                        {
                          color: textColor,
                          fontWeight: isCurrent ? "700" : "600",
                          fontSize: isCurrent ? 14 : 12,
                        },
                      ]}
                    >
                      {node.points}
                    </AppText>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  scrollContent: {
    paddingTop: 20,
  },
  pathContainer: {
    position: "relative",
  },
  nodeRow: {
    height: NODE_SIZE + VERTICAL_GAP,
    position: "relative",
  },
  node: {
    position: "absolute",
    top: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  connector: {
    position: "absolute",
    top: NODE_SIZE - 2,
    height: VERTICAL_GAP + 6,
    borderRadius: 2,
  },
  checkmark: {
    fontSize: 22,
    fontWeight: "700",
  },
  nodeText: {
    textAlign: "center",
  },
});
