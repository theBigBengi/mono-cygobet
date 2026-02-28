// features/group-creation/components/DateSlider.tsx
// Horizontal date strip with game-like styling.

import React, { useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Text,
} from "react-native";
import * as Haptics from "expo-haptics";
import { format, addDays, isToday, isSameDay } from "date-fns";
import { useTheme, CARD_BORDER_BOTTOM_WIDTH } from "@/lib/theme";

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
  const scrollRef = useRef<ScrollView>(null);

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

  const selectedIndex = useMemo(() => {
    const i = dates.findIndex((d) => isSameDay(d, selectedDate));
    return i >= 0 ? i : 0;
  }, [dates, selectedDate]);

  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      // Scroll to initial position without animation
      const offset = ITEM_TOTAL_WIDTH * selectedIndex;
      if (offset > 0) {
        scrollRef.current?.scrollTo({ x: offset, animated: false });
      }
      return;
    }
    const offset = ITEM_TOTAL_WIDTH * selectedIndex;
    scrollRef.current?.scrollTo({ x: offset, animated: true });
  }, [selectedIndex]);

  return (
    <View style={styles.wrapper}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        nestedScrollEnabled
      >
        {dates.map((date) => {
          const isSelected = isSameDay(date, selectedDate);
          const dayLabel = isToday(date)
            ? t("dates.today")
            : format(date, "EEE").toUpperCase();
          const dateLabel = format(date, "dd");

          return (
            <Pressable
              key={date.toISOString()}
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
        })}
      </ScrollView>
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
    borderBottomWidth: CARD_BORDER_BOTTOM_WIDTH,
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
