// features/group-creation/components/DateSlider.tsx
// Horizontal date strip with game-like styling.

import React, { useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  type ListRenderItemInfo,
} from "react-native";
import * as Haptics from "expo-haptics";
import { format, addDays, isToday, isSameDay } from "date-fns";
import { useTheme } from "@/lib/theme";

export interface DateSliderProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  /** Number of days to show (default: 14) */
  daysCount?: number;
}

const ITEM_WIDTH = 52;
const ITEM_MARGIN = 8;
const ITEM_TOTAL_WIDTH = ITEM_WIDTH + ITEM_MARGIN;
const DAYS_DEFAULT = 14;

export function DateSlider({
  selectedDate,
  onDateChange,
  daysCount = DAYS_DEFAULT,
}: DateSliderProps) {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  const dates = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return Array.from({ length: daysCount }, (_, i) => addDays(start, i));
  }, [daysCount]);

  const handleDatePress = (date: Date) => {
    if (!isSameDay(date, selectedDate)) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onDateChange(date);
  };

  const renderItem = ({ item: date }: ListRenderItemInfo<Date>) => {
    const isSelected = isSameDay(date, selectedDate);
    const dayLabel = isToday(date)
      ? t("dates.today")
      : format(date, "EEE").toUpperCase();
    const dateLabel = format(date, "dd");

    return (
      <Pressable
        onPress={() => handleDatePress(date)}
        style={({ pressed }) => [
          styles.item,
          {
            backgroundColor: isSelected
              ? theme.colors.primary
              : theme.colors.surface,
            borderColor: isSelected
              ? theme.colors.primary
              : theme.colors.border,
            borderBottomColor: isSelected
              ? theme.colors.primary
              : theme.colors.textSecondary + "40",
            shadowColor: "#000",
            shadowOpacity: pressed ? 0 : isSelected ? 0.25 : 0.1,
            transform: [{ scale: pressed ? 0.95 : 1 }],
          },
        ]}
      >
        <Text
          style={[
            styles.dayText,
            {
              color: isSelected ? "#fff" : theme.colors.textSecondary,
            },
          ]}
        >
          {dayLabel}
        </Text>
        <Text
          style={[
            styles.dateText,
            {
              color: isSelected ? "#fff" : theme.colors.textPrimary,
            },
          ]}
        >
          {dateLabel}
        </Text>
      </Pressable>
    );
  };

  const listRef = useRef<FlatList<Date>>(null);
  const isFirstRender = useRef(true);

  const selectedIndex = useMemo(() => {
    const i = dates.findIndex((d) => isSameDay(d, selectedDate));
    return i >= 0 ? i : 0;
  }, [dates, selectedDate]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const viewPosition = selectedIndex === 0 ? 0 : 0.5;
    listRef.current?.scrollToIndex({
      index: selectedIndex,
      animated: true,
      viewPosition,
    });
  }, [selectedIndex]);

  return (
    <View style={styles.wrapper}>
      <FlatList
        ref={listRef}
        data={dates}
        keyExtractor={(date) => date.toISOString()}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        initialScrollIndex={selectedIndex}
        getItemLayout={(_, index) => ({
          length: ITEM_TOTAL_WIDTH,
          offset: ITEM_TOTAL_WIDTH * index + 12,
          index,
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: 10,
  },
  listContent: {
    paddingHorizontal: 12,
  },
  item: {
    width: ITEM_WIDTH,
    marginRight: ITEM_MARGIN,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderBottomWidth: 3,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  dayText: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  dateText: {
    fontSize: 18,
    fontWeight: "700",
  },
});
