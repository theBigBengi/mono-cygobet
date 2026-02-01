// components/ui/Tooltip/TooltipExample.tsx
// Example usage of the Tooltip component demonstrating various features.

import React from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Tooltip } from "./Tooltip";
import { AppText } from "../AppText";
import { Row } from "../Row";
import { Stack } from "../Stack";
import { useTheme } from "@/lib/theme";

/**
 * TooltipExample
 * 
 * Demonstrates various Tooltip configurations:
 * 1. Simple string tooltip with icon
 * 2. Rich content tooltip
 * 3. All four placements
 * 4. Auto-dismiss tooltip
 * 5. Controlled tooltip
 */
export function TooltipExample() {
  const { theme } = useTheme();
  const [controlledVisible, setControlledVisible] = React.useState(false);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AppText variant="title" style={styles.title}>
        Tooltip Examples
      </AppText>

      {/* Example 1: Simple string tooltip */}
      <View style={styles.section}>
        <AppText variant="subtitle" style={styles.sectionTitle}>
          1. Simple String Tooltip
        </AppText>
        <Row gap={theme.spacing.xs}>
          <AppText>Max Members</AppText>
          <Tooltip content="Maximum number of members allowed in this group">
            <Ionicons
              name="help-circle-outline"
              size={18}
              color={theme.colors.textSecondary}
            />
          </Tooltip>
        </Row>
      </View>

      {/* Example 2: Rich content tooltip */}
      <View style={styles.section}>
        <AppText variant="subtitle" style={styles.sectionTitle}>
          2. Rich Content Tooltip
        </AppText>
        <Tooltip
          placement="bottom"
          maxWidth={260}
          content={
            <Stack gap={4}>
              <AppText
                variant="caption"
                style={{ fontWeight: "600", color: theme.colors.primaryText }}
              >
                Scoring Rules
              </AppText>
              <AppText
                variant="caption"
                style={{ color: theme.colors.primaryText }}
              >
                • Exact score: 3 pts{"\n"}• Correct winner: 1 pt
              </AppText>
            </Stack>
          }
        >
          <Pressable
            style={[
              styles.button,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <AppText color="primary">How does scoring work?</AppText>
          </Pressable>
        </Tooltip>
      </View>

      {/* Example 3: All placements */}
      <View style={styles.section}>
        <AppText variant="subtitle" style={styles.sectionTitle}>
          3. Different Placements
        </AppText>
        <View style={styles.placementGrid}>
          <Tooltip content="Top placement" placement="top">
            <Pressable
              style={[
                styles.placementButton,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <AppText style={{ color: theme.colors.primaryText }}>Top</AppText>
            </Pressable>
          </Tooltip>

          <Tooltip content="Bottom placement" placement="bottom">
            <Pressable
              style={[
                styles.placementButton,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <AppText style={{ color: theme.colors.primaryText }}>Bottom</AppText>
            </Pressable>
          </Tooltip>

          <Tooltip content="Left placement" placement="left">
            <Pressable
              style={[
                styles.placementButton,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <AppText style={{ color: theme.colors.primaryText }}>Left</AppText>
            </Pressable>
          </Tooltip>

          <Tooltip content="Right placement" placement="right">
            <Pressable
              style={[
                styles.placementButton,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <AppText style={{ color: theme.colors.primaryText }}>Right</AppText>
            </Pressable>
          </Tooltip>
        </View>
      </View>

      {/* Example 4: Auto-dismiss */}
      <View style={styles.section}>
        <AppText variant="subtitle" style={styles.sectionTitle}>
          4. Auto-Dismiss (3 seconds)
        </AppText>
        <Tooltip
          content="This tooltip will auto-dismiss after 3 seconds"
          autoDismissDelay={3000}
          placement="top"
        >
          <Pressable
            style={[
              styles.button,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <AppText>Tap me (auto-dismiss)</AppText>
          </Pressable>
        </Tooltip>
      </View>

      {/* Example 5: Controlled tooltip */}
      <View style={styles.section}>
        <AppText variant="subtitle" style={styles.sectionTitle}>
          5. Controlled Tooltip
        </AppText>
        <Stack gap={theme.spacing.sm}>
          <Tooltip
            content="This is a controlled tooltip"
            visible={controlledVisible}
            onVisibleChange={setControlledVisible}
            placement="top"
          >
            <Pressable
              style={[
                styles.button,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            >
              <AppText>Controlled Tooltip Target</AppText>
            </Pressable>
          </Tooltip>
          <Pressable
            style={[
              styles.button,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => setControlledVisible(!controlledVisible)}
          >
            <AppText style={{ color: theme.colors.primaryText }}>
              {controlledVisible ? "Hide" : "Show"} Tooltip
            </AppText>
          </Pressable>
        </Stack>
      </View>

      {/* Example 6: Without arrow */}
      <View style={styles.section}>
        <AppText variant="subtitle" style={styles.sectionTitle}>
          6. Without Arrow
        </AppText>
        <Tooltip content="Tooltip without arrow" showArrow={false}>
          <Pressable
            style={[
              styles.button,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <AppText>No Arrow</AppText>
          </Pressable>
        </Tooltip>
      </View>

      {/* Example 7: Edge detection */}
      <View style={styles.section}>
        <AppText variant="subtitle" style={styles.sectionTitle}>
          7. Edge Detection (try near screen edges)
        </AppText>
        <AppText variant="caption" color="secondary" style={styles.hint}>
          Scroll to position these near screen edges to see auto-adjustment
        </AppText>
        <Row gap={theme.spacing.md} style={{ justifyContent: "flex-start" }}>
          <Tooltip content="Will flip if too close to edge" placement="top">
            <Ionicons
              name="information-circle"
              size={32}
              color={theme.colors.primary}
            />
          </Tooltip>
          <Tooltip content="Auto-adjusts position" placement="bottom">
            <Ionicons
              name="help-circle"
              size={32}
              color={theme.colors.primary}
            />
          </Tooltip>
        </Row>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  title: {
    marginBottom: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  placementGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  placementButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
  hint: {
    marginBottom: 8,
    fontStyle: "italic",
  },
});
