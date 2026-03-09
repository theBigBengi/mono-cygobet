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
        backgroundColor: theme.colors.background,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
      }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.border, width: 36 }}
    >
      <BottomSheetView style={styles.content}>
        <AppText variant="body" style={[styles.title, { color: theme.colors.textPrimary }]}>
          {t("lobby.chooseAvatar")}
        </AppText>
        <View style={styles.grid}>
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
                    isSelected && {
                      borderColor: theme.colors.primary,
                      borderWidth: 2.5,
                    },
                  ]}
                >
                  <Text style={[styles.itemInitials, { color: "#fff" }]}>{initials}</Text>
                </LinearGradient>
                {isSelected && (
                  <View style={[styles.checkBadge, { backgroundColor: theme.colors.primary }]}>
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
  content: {
    paddingHorizontal: 24,
    paddingBottom: 36,
  },
  title: {
    textAlign: "center",
    marginBottom: 20,
    fontWeight: "600",
    fontSize: 15,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
  },
  itemContainer: {
    position: "relative",
  },
  item: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: 16,
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
    borderRadius: 9,
    width: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmButton: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
