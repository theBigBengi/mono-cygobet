// features/group-creation/components/SelectionToggleButton.tsx
// Reusable +/× toggle button with 45° rotation animation (used for leagues, teams, and later games).

import React, { useEffect } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { MaterialIcons } from "@expo/vector-icons";
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

  useEffect(() => {
    rotation.value = withTiming(isSelected ? 45 : 0, { duration: 200 });
  }, [isSelected]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: isSelected
            ? theme.colors.danger + "15"
            : theme.colors.surface,
          borderColor: isSelected ? theme.colors.danger : theme.colors.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Animated.View style={animatedStyle}>
        <MaterialIcons
          name="add"
          size={20}
          color={isSelected ? theme.colors.danger : theme.colors.primary}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginStart: 8,
  },
});
