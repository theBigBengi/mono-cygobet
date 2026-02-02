// features/group-creation/filters/FilterDrawer.tsx
// Layer 2: full-screen modal for advanced filters (leagues).

import React, { useEffect, useState } from "react";
import { Modal, View, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { AppText, Button } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { LeagueFilterList } from "./LeagueFilterList";

interface FilterDrawerProps {
  visible: boolean;
  onClose: () => void;
  selectedLeagueIds: number[];
  onApply: (leagueIds: number[]) => void;
  onClear: () => void;
}

export function FilterDrawer({
  visible,
  onClose,
  selectedLeagueIds,
  onApply,
  onClear,
}: FilterDrawerProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [localSelectedIds, setLocalSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    if (visible) {
      setLocalSelectedIds(selectedLeagueIds);
    }
  }, [visible, selectedLeagueIds]);

  const handleApply = () => {
    onApply(localSelectedIds);
    onClose();
  };

  const handleClear = () => {
    setLocalSelectedIds([]);
    onClear();
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
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
            Filters
          </AppText>
          <Pressable
            onPress={handleClear}
            style={styles.headerBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <AppText variant="body" color="primary">
              Clear
            </AppText>
          </Pressable>
        </View>

        <View style={styles.body}>
          <AppText variant="subtitle" style={styles.sectionTitle}>
            Leagues
          </AppText>
          <LeagueFilterList
            selectedLeagueIds={localSelectedIds}
            onSelectionChange={setLocalSelectedIds}
          />
        </View>

        <View
          style={[
            styles.footer,
            { borderTopColor: theme.colors.border, paddingBottom: insets.bottom + 16 },
          ]}
        >
          <Button title="Apply Filters" onPress={handleApply} />
        </View>
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
    minWidth: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontWeight: "600",
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: "600",
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
});
