import React, { useState, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  StatusBar,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/lib/theme";
import { AppText } from "@/components/ui";
import * as Haptics from "expo-haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const NODE_SIZE = 56;
const VERTICAL_GAP = 28;
const PATH_AMPLITUDE = SCREEN_WIDTH * 0.28;

const POPOVER_WIDTH = SCREEN_WIDTH * 0.7;
const ARROW_SIZE = 10;

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
  const [activeNodeId, setActiveNodeId] = useState<number | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ cx: number; bottom: number } | null>(null);
  const currentNodeRef = useRef<View>(null);

  const nodesBottomUp = [...NODES].reverse();

  const handleNodePress = useCallback((nodeId: number, isCurrent: boolean) => {
    if (!isCurrent) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (activeNodeId === nodeId) {
      setActiveNodeId(null);
      setPopoverPos(null);
      return;
    }

    currentNodeRef.current?.measureInWindow((x, y, width, height) => {
      setPopoverPos({ cx: x + width / 2, bottom: y + height });
      setActiveNodeId(nodeId);
    });
  }, [activeNodeId]);

  const dismissPopover = useCallback(() => {
    setActiveNodeId(null);
    setPopoverPos(null);
  }, []);

  const handleStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    dismissPopover();
    // TODO: navigate to lesson
  };

  // Clamp popover so it doesn't go off-screen
  const popoverLeft = popoverPos
    ? Math.max(12, Math.min(popoverPos.cx - POPOVER_WIDTH / 2, SCREEN_WIDTH - POPOVER_WIDTH - 12))
    : 0;
  const arrowScreenX = popoverPos ? popoverPos.cx : 0;
  const arrowLeftInPopover = arrowScreenX - popoverLeft - ARROW_SIZE;

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
        onScrollBeginDrag={dismissPopover}
      >
        <View style={styles.pathContainer}>
          {nodesBottomUp.map((node, index) => {
            const reversedIndex = NODES.length - 1 - index;
            const xOffset = Math.sin(reversedIndex * 0.6) * PATH_AMPLITUDE;

            const isCompleted = node.completed;
            const isCurrent = node.current;
            const isLocked = !isCompleted && !isCurrent;

            const bgColor = isCompleted
              ? theme.colors.success
              : isCurrent
                ? theme.colors.primary
                : theme.colors.border;
            const textColor = isLocked
              ? theme.colors.textDisabled
              : "#FFFFFF";

            const showConnector = index < nodesBottomUp.length - 1;
            const nextReversedIndex = NODES.length - 2 - index;
            const nextXOffset = Math.sin(nextReversedIndex * 0.6) * PATH_AMPLITUDE;

            const currentNodeSize = isCurrent ? NODE_SIZE + 8 : NODE_SIZE;
            const nodeLeft = SCREEN_WIDTH / 2 + xOffset - currentNodeSize / 2;

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
                <Pressable
                  ref={isCurrent ? currentNodeRef : undefined}
                  onPress={() => handleNodePress(node.id, isCurrent)}
                  style={[
                    styles.node,
                    {
                      width: currentNodeSize,
                      height: currentNodeSize,
                      borderRadius: currentNodeSize / 2,
                      backgroundColor: bgColor,
                      left: nodeLeft,
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
                </Pressable>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Floating popover overlay */}
      {activeNodeId !== null && popoverPos && (
        <>
          {/* Invisible backdrop to dismiss */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={dismissPopover}
          />

          {/* Popover */}
          <View
            pointerEvents="box-none"
            style={[
              styles.popoverContainer,
              {
                top: popoverPos.bottom + 8,
                left: popoverLeft,
              },
            ]}
          >
            {/* Arrow */}
            <View
              style={[
                styles.arrow,
                {
                  left: arrowLeftInPopover,
                  borderBottomColor: theme.colors.primary,
                },
              ]}
            />

            <View
              style={[
                styles.popover,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <AppText style={styles.popoverTitle}>
                Pair letters and sounds
              </AppText>
              <AppText style={styles.popoverSubtitle}>
                Lesson 3 of 5
              </AppText>

              <Pressable
                onPress={handleStart}
                style={({ pressed }) => [
                  styles.startButton,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <AppText
                  style={[
                    styles.startButtonText,
                    { color: theme.colors.primary },
                  ]}
                >
                  START +20 XP
                </AppText>
              </Pressable>
            </View>
          </View>
        </>
      )}
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
  popoverContainer: {
    position: "absolute",
    width: POPOVER_WIDTH,
    zIndex: 100,
  },
  arrow: {
    position: "absolute",
    top: 0,
    width: 0,
    height: 0,
    zIndex: 101,
    borderLeftWidth: ARROW_SIZE,
    borderRightWidth: ARROW_SIZE,
    borderBottomWidth: ARROW_SIZE,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  popover: {
    marginTop: ARROW_SIZE,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  popoverTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 2,
  },
  popoverSubtitle: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 14,
  },
  startButton: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  startButtonText: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
