import React, { useCallback, useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { useTranslation } from "react-i18next";
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
} from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/theme";
import { AVATAR_GRADIENTS } from "@/lib/constants/avatarGradients";
import { AppText } from "@/components/ui";

interface AvatarPickerSheetProps {
  sheetRef: React.RefObject<React.ComponentRef<typeof BottomSheetModal>>;
  selectedValue: string;
  onSelect: (index: string) => void;
  initials: string;
}

const ITEM_SIZE = 64;

export function AvatarPickerSheet({
  sheetRef,
  selectedValue,
  onSelect,
  initials,
}: AvatarPickerSheetProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const [localValue, setLocalValue] = useState(selectedValue);

  // Sync local state when the sheet opens with a new value
  useEffect(() => {
    setLocalValue(selectedValue);
  }, [selectedValue]);

  const handleConfirm = useCallback(() => {
    onSelect(localValue);
    sheetRef.current?.dismiss();
  }, [onSelect, localValue, sheetRef]);

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
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
      enableDynamicSizing
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: theme.colors.surfaceElevated,
        borderTopLeftRadius: theme.radius.xl,
        borderTopRightRadius: theme.radius.xl,
      }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary, width: 36, height: 4 }}
    >
      <BottomSheetView style={[styles.content, { paddingHorizontal: theme.spacing.lg, paddingBottom: 36 }]}>
        <AppText variant="body" style={[styles.title, { color: theme.colors.textPrimary, marginBottom: theme.spacing.ml }]}>
          {t("lobby.chooseAvatar")}
        </AppText>
        <View style={[styles.grid, { gap: theme.spacing.ms }]}>
          {AVATAR_GRADIENTS.map((colors, index) => {
            const isSelected = String(index) === localValue;
            return (
              <Pressable
                key={index}
                onPress={() => setLocalValue(String(index))}
                style={styles.itemContainer}
              >
                <LinearGradient
                  colors={colors as unknown as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.item,
                    { borderRadius: theme.radius.lg },
                    isSelected && {
                      borderColor: theme.colors.primary,
                      borderWidth: 2.5,
                    },
                  ]}
                >
                  <Text style={[styles.itemInitials, { color: "#fff" }]}>{initials}</Text>
                </LinearGradient>
                {isSelected && (
                  <View style={[styles.checkBadge, { backgroundColor: theme.colors.primary, borderRadius: theme.radius.full }]}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
        <Pressable
          onPress={handleConfirm}
          style={({ pressed }) => [
            styles.confirmButton,
            {
              backgroundColor: theme.colors.primary,
              marginTop: theme.spacing.lg,
              paddingVertical: theme.radius.md,
              borderRadius: theme.radius.md,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={styles.confirmButtonText}>{t("common.save")}</Text>
        </Pressable>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  content: {},
  title: {
    textAlign: "center",
    fontWeight: "600",
    fontSize: 15,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  itemContainer: {
    position: "relative",
  },
  item: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  itemInitials: {
    fontWeight: "700",
    fontSize: 18,
  },
  checkBadge: {
    position: "absolute",
    bottom: -3,
    right: -3,
    width: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmButton: {
    alignItems: "center",
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
