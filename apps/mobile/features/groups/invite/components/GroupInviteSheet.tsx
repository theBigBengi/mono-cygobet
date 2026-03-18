// features/groups/invite/components/GroupInviteSheet.tsx
// Bottom sheet wrapper for the group invite screen.

import React, { useCallback } from "react";
import { View, StyleSheet, Text, Pressable, Share } from "react-native";
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/lib/theme";
import { useInviteCodeQuery } from "@/domains/groups";
import { GroupInviteScreen } from "../screens/GroupInviteScreen";

const DEEP_LINK_BASE = "https://mono-cygobet.onrender.com/groups/join";

interface GroupInviteSheetProps {
  groupId: number | null;
  groupName?: string;
  sheetRef: React.RefObject<React.ComponentRef<typeof BottomSheetModal> | null>;
}

export function GroupInviteSheet({
  groupId,
  groupName,
  sheetRef,
}: GroupInviteSheetProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const { data } = useInviteCodeQuery(groupId);
  const inviteCode = data?.data?.inviteCode ?? "";

  const handleShareLink = () => {
    if (!inviteCode) return;
    const link = `${DEEP_LINK_BASE}?code=${encodeURIComponent(inviteCode)}`;
    const message = `${t("invite.joinMessage")}\n${link}`;
    Share.share({ message, title: t("invite.groupInvite") }).catch(() => {});
  };

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
      />
    ),
    []
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing={false}
      snapPoints={["90%"]}
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: theme.colors.surfaceElevated,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
      }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.textDisabled }}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
            {t("groups.invite")}
          </Text>
          <Pressable
            onPress={handleShareLink}
            hitSlop={12}
            style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.5 }]}
          >
            <Ionicons name="share-outline" size={20} color={theme.colors.textSecondary} />
          </Pressable>
        </View>
        <GroupInviteScreen groupId={groupId} groupName={groupName} />
      </View>
    </BottomSheetModal>
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
    paddingTop: 4,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  headerBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
});
