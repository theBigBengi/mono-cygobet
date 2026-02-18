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
            backgroundColor: isDeselected
              ? theme.colors.primary
              : theme.colors.surface,
            borderColor: isDeselected
              ? theme.colors.primary
              : theme.colors.border,
            borderBottomColor: isDeselected
              ? theme.colors.primary
              : theme.colors.textSecondary + "40",
            shadowColor: isDeselected ? theme.colors.primary : "#000",
            shadowOpacity: pressed ? 0 : isDeselected ? 0.25 : 0.1,
            transform: [{ scale: pressed ? 0.92 : 1 }],
          },
        ]}
      >
        <MaterialIcons
          name={isDeselected ? "add" : "close"}
          size={16}
          color={isDeselected ? "#fff" : theme.colors.danger}
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
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderBottomWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 3,
  },
});
