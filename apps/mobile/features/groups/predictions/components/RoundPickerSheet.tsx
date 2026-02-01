// components/RoundPickerSheet.tsx
// Bottom sheet with scrollable list of rounds and status indicators.

import React, { useEffect, useRef } from "react";
import { Modal, View, StyleSheet, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import type { RoundInfo, RoundStatus } from "../hooks/useSmartFilters";

interface RoundPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  rounds: RoundInfo[];
  selectedRound: string;
  onSelectRound: (round: string) => void;
}

function statusIcon(status: RoundStatus): "lens" | "schedule" | "check-circle" | "radio-button-unchecked" {
  switch (status) {
    case "live":
      return "lens";
    case "unpredicted":
      return "schedule";
    case "settled":
      return "check-circle";
    case "upcoming":
    default:
      return "radio-button-unchecked";
  }
}

function statusLabel(status: RoundStatus): string {
  switch (status) {
    case "live":
      return "has live";
    case "unpredicted":
      return "has unpredicted";
    case "settled":
      return "all settled";
    case "upcoming":
    default:
      return "upcoming";
  }
}

export function RoundPickerSheet({
  visible,
  onClose,
  rounds,
  selectedRound,
  onSelectRound,
}: RoundPickerSheetProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const selectedIndex = rounds.findIndex((r) => r.round === selectedRound);

  useEffect(() => {
    if (visible && selectedIndex >= 0 && scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          y: Math.max(0, selectedIndex * 56 - 100),
          animated: true,
        });
      }, 100);
    }
  }, [visible, selectedIndex]);

  const handleSelect = (round: string) => {
    onSelectRound(round);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      statusBarTranslucent={false}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.background,
            paddingTop: insets.top,
          },
        ]}
      >
        <View
          style={[styles.header, { borderBottomColor: theme.colors.border }]}
        >
          <Pressable
            onPress={onClose}
            style={styles.headerBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons
              name="close"
              size={32}
              color={theme.colors.textSecondary}
            />
          </Pressable>
          <AppText variant="subtitle" style={styles.headerTitle}>
            Select round
          </AppText>
          <View style={styles.headerBtn} />
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={true}
        >
          {rounds.map((r) => {
            const isSelected = r.round === selectedRound;
            const iconName = statusIcon(r.status);
            return (
              <Pressable
                key={r.round}
                onPress={() => handleSelect(r.round)}
                style={[
                  styles.row,
                  {
                    backgroundColor: isSelected
                      ? theme.colors.cardBackground
                      : "transparent",
                    borderLeftColor: isSelected
                      ? theme.colors.primary
                      : "transparent",
                  },
                ]}
              >
                <MaterialIcons
                  name={iconName as "check-circle"}
                  size={20}
                  color={
                    r.status === "live"
                      ? "#EF4444"
                      : r.status === "unpredicted"
                        ? theme.colors.primary
                        : theme.colors.textSecondary
                  }
                />
                <View style={styles.rowText}>
                  <AppText
                    variant="body"
                    style={[
                      styles.roundLabel,
                      isSelected && { fontWeight: "600", color: theme.colors.primary },
                    ]}
                  >
                    Round {r.round}
                  </AppText>
                  <AppText variant="caption" color="secondary">
                    {statusLabel(r.status)} · {r.count} fixture{r.count !== 1 ? "s" : ""}
                  </AppText>
                </View>
                {isSelected && (
                  <MaterialIcons
                    name="check"
                    size={24}
                    color={theme.colors.primary}
                  />
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontWeight: "600",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 32,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderLeftWidth: 4,
  },
  rowText: {
    flex: 1,
  },
  roundLabel: {
    marginBottom: 2,
  },
});
