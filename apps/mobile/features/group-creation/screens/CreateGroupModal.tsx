// features/group-creation/screens/CreateGroupModal.tsx
// Modal to create group from selection. Supports games, leagues, teams.

import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Modal,
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAtomValue, useSetAtom } from "jotai";
import { BlurView } from "expo-blur";
import { AppText, Button } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { globalBlockingOverlayAtom } from "@/lib/state/globalOverlay.atom";
import {
  CreateGroupModalFixturesView,
  CreateGroupModalLeaguesView,
  CreateGroupModalTeamsView,
} from "../components/CreateGroupModal";
import { createGroupModalVisibleAtom } from "./create-group-modal.atom";
import { useCreateGroup } from "../hooks/useCreateGroup";

export function CreateGroupModal() {
  const { t } = useTranslation("common");
  const { theme, colorScheme } = useTheme();
  const insets = useSafeAreaInsets();
  const overlayMessage = useAtomValue(globalBlockingOverlayAtom);
  const isOverlayActive = !!overlayMessage;
  const visible = useAtomValue(createGroupModalVisibleAtom);
  const setModalVisible = useSetAtom(createGroupModalVisibleAtom);

  const {
    mode,
    canCreate,
    isCreating,
    hasError,
    error,
    isSuccess,
    reset,
    handleCreate,
    handleCreateAndPublish,
  } = useCreateGroup();

  useEffect(() => {
    if (!visible) reset();
  }, [visible, reset]);

  // Close modal when overlay turns off after successful creation
  useEffect(() => {
    if (isSuccess && !isOverlayActive) {
      setModalVisible(false);
    }
  }, [isSuccess, isOverlayActive, setModalVisible]);

  const handleRequestClose = () => {
    if (isCreating || isOverlayActive) return;
    setModalVisible(false);
  };

  const title =
    mode === "fixtures"
      ? t("groupCreation.selectedGames")
      : mode === "leagues"
        ? t("groupCreation.selectedLeague")
        : t("groupCreation.selectedTeams");

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleRequestClose}
      presentationStyle="pageSheet"
      statusBarTranslucent={false}
    >
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View
          style={[styles.header, { borderBottomColor: theme.colors.border }]}
        >
          <Pressable
            onPress={handleRequestClose}
            style={styles.headerBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            disabled={isCreating}
          >
            <MaterialIcons
              name="close"
              size={32}
              color={theme.colors.textSecondary}
            />
          </Pressable>
          <AppText variant="subtitle" style={styles.headerTitle}>
            {title}
          </AppText>
          <View style={styles.headerBtn} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          scrollEnabled={!isCreating}
        >
          {mode === "fixtures" && <CreateGroupModalFixturesView />}
          {mode === "leagues" && <CreateGroupModalLeaguesView />}
          {mode === "teams" && <CreateGroupModalTeamsView />}
        </ScrollView>

        {isCreating && !isOverlayActive && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <AppText variant="body" color="secondary" style={styles.loadingTxt}>
              {t("groupCreation.creating")}
            </AppText>
          </View>
        )}

        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom, theme.spacing.md),
              paddingHorizontal: theme.spacing.md,
            },
          ]}
          pointerEvents="box-none"
        >
          {hasError && (
            <View
              style={[
                styles.errorBox,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.danger,
                },
              ]}
            >
              <AppText variant="caption" color="danger" style={styles.errorTxt}>
                {error?.message ?? t("groupCreation.failedCreate")}
              </AppText>
            </View>
          )}
          <Button
            label={
              isCreating
                ? t("groupCreation.creating")
                : t("groupCreation.createAndPublish")
            }
            onPress={handleCreateAndPublish}
            disabled={isCreating || !canCreate}
            style={styles.createBtn}
          />
          <Button
            label={t("groupCreation.createDraft")}
            variant="secondary"
            onPress={handleCreate}
            disabled={isCreating || !canCreate}
            style={styles.createDraftBtn}
          />
        </View>
      </View>

      {isOverlayActive && (
        <View style={styles.globalOverlay} pointerEvents="box-none">
          <BlurView
            intensity={80}
            tint={colorScheme === "dark" ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.globalOverlayContent}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <AppText
              variant="body"
              color="secondary"
              style={styles.globalOverlayText}
            >
              {typeof overlayMessage === "string"
                ? overlayMessage
                : t("groupCreation.creating")}
            </AppText>
          </View>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2000,
  },
  loadingTxt: {
    marginTop: 12,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 1000,
  },
  errorBox: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    width: "100%",
  },
  errorTxt: {
    textAlign: "center",
  },
  createBtn: {
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderRadius: 12,
    marginBottom: 8,
  },
  createDraftBtn: {
    width: "100%",
    borderRadius: 12,
  },
  globalOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    justifyContent: "center",
    alignItems: "center",
  },
  globalOverlayContent: {
    alignItems: "center",
    gap: 16,
  },
  globalOverlayText: {
    marginTop: 12,
  },
});
