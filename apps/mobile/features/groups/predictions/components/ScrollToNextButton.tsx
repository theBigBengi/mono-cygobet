import React from "react";
import { View, StyleSheet, Pressable, Platform, type ViewStyle } from "react-native";
import Animated, { type AnimatedStyleProp } from "react-native-reanimated";
import { useTheme } from "@/lib/theme";
import { HEADER_HEIGHT } from "../utils/constants";

type Props = {
  direction: "up" | "down";
  onPress: () => void;
  insetTop: number;
  insetBottom: number;
  keyboardHeight: number;
  scrollBtnAnimatedStyle?: AnimatedStyleProp<ViewStyle>;
};

export const ScrollToNextButton = React.memo(function ScrollToNextButton({
  direction,
  onPress,
  insetTop,
  insetBottom,
  keyboardHeight,
  scrollBtnAnimatedStyle,
}: Props) {
  const { theme } = useTheme();

  if (direction === "up") {
    return (
      <Animated.View
        style={[
          styles.scrollToNextBtn,
          {
            backgroundColor: "#000000",
            top: HEADER_HEIGHT + insetTop + 12,
          },
          scrollBtnAnimatedStyle,
        ]}
      >
        <Pressable onPress={onPress} style={styles.scrollToNextBtnInner}>
          <View
            style={[
              styles.scrollToNextArrow,
              { borderTopColor: "#fff" },
              { transform: [{ rotate: "180deg" }] },
            ]}
          />
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Pressable
      style={[
        styles.scrollToNextBtn,
        { backgroundColor: "#000000" },
        {
          bottom:
            keyboardHeight > 0
              ? keyboardHeight +
                (Platform.OS === "android" ? 60 : 10) +
                68
              : insetBottom + 8,
        },
      ]}
      onPress={onPress}
    >
      <View style={[styles.scrollToNextArrow, { borderTopColor: "#fff" }]} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  scrollToNextBtn: {
    position: "absolute",
    left: 16,
    zIndex: 20,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollToNextBtnInner: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollToNextArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
});
