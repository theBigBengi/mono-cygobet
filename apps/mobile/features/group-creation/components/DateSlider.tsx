// features/group-creation/components/DateSlider.tsx
// Horizontal date strip: today + N days, selectable with underline.

import React, { useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  FlatList,
  Pressable,
  StyleSheet,
  type ListRenderItemInfo,
} from "react-native";
import { format, addDays, isToday, isSameDay } from "date-fns";
import { useTheme } from "@/lib/theme";
import { AppText } from "@/components/ui";

export interface DateSliderProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  /** Number of days to show (default: 14) */
  daysCount?: number;
}

const ITEM_WIDTH = 56;
const ITEM_MARGIN = 4; // marginHorizontal: 2 per side
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

  const renderItem = ({ item: date }: ListRenderItemInfo<Date>) => {
    const isSelected = isSameDay(date, selectedDate);
    const dayLabel = isToday(date)
      ? t("dates.today")
      : format(date, "EEE").toUpperCase();
    const dateLabel = format(date, "dd.MM.");

    return (
      <Pressable
        onPress={() => onDateChange(date)}
        style={({ pressed }) => [styles.item, { opacity: pressed ? 0.7 : 1 }]}
      >
        <AppText
          variant="label"
          style={[
            styles.dayText,
            {
              color: isSelected
                ? theme.colors.primary
                : theme.colors.textSecondary,
              fontWeight: isSelected ? "600" : "400",
            },
          ]}
        >
          {dayLabel}
        </AppText>
        <AppText
          variant="caption"
          style={[
            styles.dateText,
            {
              color: isSelected
                ? theme.colors.primary
                : theme.colors.textSecondary,
            },
          ]}
        >
          {dateLabel}
        </AppText>
        {isSelected && (
          <View
            style={[
              styles.underline,
              { backgroundColor: theme.colors.primary },
            ]}
          />
        )}
      </Pressable>
    );
  };

  const listRef = useRef<FlatList<Date>>(null);

  const selectedIndex = useMemo(() => {
    const i = dates.findIndex((d) => isSameDay(d, selectedDate));
    return i >= 0 ? i : 0;
  }, [dates, selectedDate]);

  useEffect(() => {
    listRef.current?.scrollToIndex({
      index: selectedIndex,
      animated: true,
      viewPosition: 0.5,
    });
  }, [selectedIndex]);

  return (
    <View style={[styles.wrapper, { borderColor: theme.colors.border }]}>
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
          offset: ITEM_TOTAL_WIDTH * index,
          index,
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    minHeight: 50,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  listContent: {
    paddingHorizontal: 8,
    alignItems: "flex-end",
  },
  item: {
    width: ITEM_WIDTH,
    marginHorizontal: 2,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  dayText: {
    fontSize: 12,
    letterSpacing: 0.2,
  },
  dateText: {
    marginTop: 2,
    fontSize: 11,
  },
  underline: {
    position: "absolute",
    bottom: 0,
    left: 8,
    right: 8,
    height: 2.5,
    borderRadius: 2,
  },
});
