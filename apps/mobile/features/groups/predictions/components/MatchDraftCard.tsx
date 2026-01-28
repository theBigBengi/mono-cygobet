import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useTheme } from "@/lib/theme";
import { GameCardBase } from "@/components/Fixtures";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { FixtureItem, PositionInGroup } from "@/types/common";

type Props = {
  fixture: FixtureItem;
  positionInGroup?: PositionInGroup;
  /** When true, card is dimmed and shows blue plus (restore) instead of X (remove) */
  isDeselected?: boolean;
  onRemove?: () => void;
  onRestore?: () => void;
};

/**
 * Match card with remove/restore button in the middle (for draft status).
 * X = mark as deselected (dim card, show plus). Plus = restore.
 */
export function MatchDraftCard({
  fixture,
  positionInGroup = "single",
  isDeselected = false,
  onRemove,
  onRestore,
}: Props) {
  const { theme } = useTheme();

  const buttonSection = (
    <View style={styles.buttonContainer}>
      <Pressable
        onPress={isDeselected ? onRestore : onRemove}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <MaterialIcons
          name={isDeselected ? "add" : "close"}
          size={18}
          color={
            isDeselected
              ? theme.colors.primary
              : theme.colors.danger || theme.colors.textPrimary
          }
        />
      </Pressable>
    </View>
  );

  const card = (
    <GameCardBase fixture={fixture} positionInGroup={positionInGroup}>
      {buttonSection}
    </GameCardBase>
  );

  if (isDeselected) {
    return (
      <View style={styles.cardWrapper}>
        <View style={[styles.dimmedCard, { opacity: 0.5 }]}>{card}</View>
        <View style={styles.buttonOverlay} pointerEvents="box-none">
          {buttonSection}
        </View>
      </View>
    );
  }

  return card;
}

const styles = StyleSheet.create({
  cardWrapper: {
    position: "relative",
  },
  dimmedCard: {},
  buttonContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  buttonOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  button: {
    width: 28,
    height: 28,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
