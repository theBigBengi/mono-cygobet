// components/CompetitionPickerSheet.tsx
// Bottom sheet with scrollable list of competitions/leagues for filtering.

import React, { useCallback, useMemo } from "react";
import { View, StyleSheet, Pressable, Image } from "react-native";
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { MaterialIcons } from "@expo/vector-icons";
import { AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useTranslation } from "react-i18next";
import type { CompetitionChip } from "../hooks/useSmartFilters";

interface CompetitionPickerSheetProps {
  sheetRef: React.RefObject<React.ComponentRef<typeof BottomSheetModal>>;
  competitions: CompetitionChip[];
  selectedCompetitionId: number | null;
  onSelectCompetition: (competitionId: number | null) => void;
}

export function CompetitionPickerSheet({
  sheetRef,
  competitions,
  selectedCompetitionId,
  onSelectCompetition,
}: CompetitionPickerSheetProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  const backgroundStyle = useMemo(
    () => ({
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 16,
    }),
    [theme.colors.surface]
  );

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

  const handleSelect = useCallback(
    (competitionId: number | null) => {
      onSelectCompetition(competitionId);
      sheetRef.current?.dismiss();
    },
    [onSelectCompetition, sheetRef]
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={backgroundStyle}
      handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary }}
      maxDynamicContentSize={500}
    >
      <View style={styles.header}>
        <AppText variant="subtitle" style={styles.headerTitle}>
          {t("predictions.selectCompetition", {
            defaultValue: "Select Competition",
          })}
        </AppText>
      </View>

      <BottomSheetScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={true}
      >
        {/* All competitions option */}
        <Pressable
          onPress={() => handleSelect(null)}
          style={({ pressed }) => [
            styles.row,
            {
              backgroundColor:
                selectedCompetitionId === null
                  ? theme.colors.cardBackground
                  : "transparent",
              borderLeftColor:
                selectedCompetitionId === null
                  ? theme.colors.primary
                  : "transparent",
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <View
            style={[
              styles.allCompetitionsIcon,
              { backgroundColor: theme.colors.border },
            ]}
          >
            <MaterialIcons
              name="emoji-events"
              size={20}
              color={theme.colors.textSecondary}
            />
          </View>
          <View style={styles.rowText}>
            <AppText
              variant="body"
              style={[
                styles.competitionName,
                selectedCompetitionId === null && {
                  fontWeight: "600",
                  color: theme.colors.primary,
                },
              ]}
            >
              {t("predictions.allCompetitions", {
                defaultValue: "All Competitions",
              })}
            </AppText>
          </View>
          {selectedCompetitionId === null && (
            <MaterialIcons
              name="check"
              size={24}
              color={theme.colors.primary}
            />
          )}
        </Pressable>

        {/* Individual competitions */}
        {competitions.map((competition) => {
          const isSelected = competition.id === selectedCompetitionId;
          return (
            <Pressable
              key={competition.id}
              onPress={() => handleSelect(competition.id)}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: isSelected
                    ? theme.colors.cardBackground
                    : "transparent",
                  borderLeftColor: isSelected
                    ? theme.colors.primary
                    : "transparent",
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              {competition.imagePath ? (
                <Image
                  source={{ uri: competition.imagePath }}
                  style={styles.competitionLogo}
                  resizeMode="contain"
                />
              ) : (
                <View
                  style={[
                    styles.competitionLogoPlaceholder,
                    { backgroundColor: theme.colors.border },
                  ]}
                >
                  <MaterialIcons
                    name="emoji-events"
                    size={18}
                    color={theme.colors.textSecondary}
                  />
                </View>
              )}
              <View style={styles.rowText}>
                <AppText
                  variant="body"
                  style={[
                    styles.competitionName,
                    isSelected && {
                      fontWeight: "600",
                      color: theme.colors.primary,
                    },
                  ]}
                >
                  {competition.name}
                </AppText>
                {competition.countryName && (
                  <AppText variant="caption" color="secondary">
                    {competition.countryName}
                  </AppText>
                )}
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
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontWeight: "600",
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 40,
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
  competitionName: {
    marginBottom: 0,
  },
  competitionLogo: {
    width: 32,
    height: 32,
  },
  competitionLogoPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  allCompetitionsIcon: {
    width: 32,
    height: 32,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
});
