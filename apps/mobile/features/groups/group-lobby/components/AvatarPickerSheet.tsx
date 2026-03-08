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
import { useTheme, CARD_BORDER_BOTTOM_WIDTH } from "@/lib/theme";
import { AVATAR_GRADIENTS } from "@/lib/constants/avatarGradients";
import { AppText, Button } from "@/components/ui";

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
      backgroundStyle={{ backgroundColor: theme.colors.background }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary }}
    >
      <BottomSheetView style={styles.content}>
        <AppText variant="title" style={styles.title}>
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
                    {
                      borderColor: theme.colors.textInverse + "33",
                      borderBottomColor: theme.colors.textPrimary + "26",
                    },
                    isSelected && {
                      borderColor: theme.colors.primary,
                      borderWidth: 3,
                      borderBottomWidth: CARD_BORDER_BOTTOM_WIDTH,
                      borderBottomColor: theme.colors.primary,
                    },
                  ]}
                >
                  <Text style={[styles.itemInitials, { color: theme.colors.textInverse }]}>{initials}</Text>
                </LinearGradient>
                {isSelected && (
                  <View style={[styles.checkBadge, { backgroundColor: theme.colors.textInverse }]}>
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
        <Button
          label={t("common.save")}
          onPress={handleConfirm}
          style={styles.confirmButton}
        />
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  title: {
    textAlign: "center",
    marginBottom: 20,
    fontWeight: "700",
    fontSize: 18,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
  },
  itemContainer: {
    alignItems: "center",
    position: "relative",
  },
  item: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderBottomWidth: 4,
  },
  itemInitials: {
    fontWeight: "800",
    fontSize: 20,
  },
  checkBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmButton: {
    marginTop: 24,
  },
});
