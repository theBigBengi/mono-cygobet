// features/groups/group-lobby/components/GroupSettingsModal.tsx
// Modal component for group settings.

import React from "react";
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";

interface GroupSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * GroupSettingsModal
 * 
 * Modal component for displaying and managing group settings.
 * Currently shows only a title.
 */
export function GroupSettingsModal({
  visible,
  onClose,
}: GroupSettingsModalProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

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
          style={[
            styles.header,
            { borderBottomColor: theme.colors.border },
          ]}
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
            Group Settings
          </AppText>
          <View style={styles.headerBtn} />
        </View>

        <View style={styles.content}>
          {/* Settings content will be added here */}
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
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 16,
  },
});
