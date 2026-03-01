import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { TeamLogo } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { getContrastTextColor } from "../utils/color-helpers";

const DIGITS = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
const THUMB_SIZE = 44;

type Props = {
  side: "home" | "away";
  value: number | null;
  thumbColor: string;
  teamImagePath?: string | null;
  teamName?: string;
};

/**
 * Visual-only vertical score slider for layout exploration.
 * No gesture handling — purely decorative.
 */
export function VerticalScoreSliderMock({
  side,
  value,
  thumbColor,
  teamImagePath,
  teamName,
}: Props) {
  const { theme } = useTheme();
  const textColor = getContrastTextColor(thumbColor);

  return (
    <View style={[
      styles.container,
      { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      side === "home"
        ? { borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeftWidth: 0 }
        : { borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRightWidth: 0 },
    ]}>
      {DIGITS.map((digit) => {
        const isActive = digit === value;
        return (
          <View key={digit} style={styles.cell}>
            {isActive ? (
              <View style={[styles.thumb, { backgroundColor: thumbColor }]}>
                <Text style={[styles.thumbText, { color: textColor }]}>{digit}</Text>
              </View>
            ) : (
              <Text style={[styles.digitText, { color: theme.colors.textSecondary }]}>
                {digit}
              </Text>
            )}
          </View>
        );
      })}
      <View style={styles.logoCell}>
        {value == null ? (
          <View style={[styles.thumb, { backgroundColor: thumbColor }]}>
            <TeamLogo imagePath={teamImagePath} teamName={teamName ?? ""} size={30} rounded={false} />
          </View>
        ) : (
          <TeamLogo imagePath={teamImagePath} teamName={teamName ?? ""} size={28} rounded={false} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 44,
    borderRadius: 14,
    paddingVertical: 6,
    alignItems: "center",
    borderWidth: 1,
  },
  cell: {
    height: 40,
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  logoCell: {
    height: 44,
    width: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  digitText: {
    fontSize: 15,
    fontWeight: "600",
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  thumbText: {
    fontSize: 20,
    fontWeight: "800",
  },
});
