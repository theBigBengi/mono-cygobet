// features/group-creation/components/SelectionToggleButton.tsx
// Game-like +/× toggle button with animation and haptic feedback.

import React, { useEffect } from "react";
import { Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/theme";

interface SelectionToggleButtonProps {
  isSelected: boolean;
  onPress: () => void;
}

export function SelectionToggleButton({
  isSelected,
  onPress,
}: SelectionToggleButtonProps) {
  const { theme } = useTheme();
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    rotation.value = withSpring(isSelected ? 45 : 0, {
      damping: 12,
      stiffness: 200,
    });
  }, [isSelected]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value = withSpring(0.8, { damping: 10 }, () => {
      scale.value = withSpring(1, { damping: 10 });
    });
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={({ pressed }) => [
        styles.button,
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
          shadowColor: isSelected ? theme.colors.primary : "#000",
          shadowOpacity: pressed ? 0 : isSelected ? 0.3 : 0.1,
          transform: [{ scale: pressed ? 0.9 : 1 }],
        },
      ]}
    >
      <Animated.View style={animatedStyle}>
        <Ionicons
          name="add"
          size={20}
          color={isSelected ? "#fff" : theme.colors.primary}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderBottomWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    marginStart: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 3,
  },
});
