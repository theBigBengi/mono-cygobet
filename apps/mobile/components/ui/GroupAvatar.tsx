import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme, getShadowStyle } from "@/lib/theme";
import { AVATAR_GRADIENTS } from "@/lib/constants/avatarGradients";

type Props = {
  avatarType?: string | null;
  avatarValue?: string | null;
  initials: string;
  size?: number;
  borderRadius?: number;
  /** Remove border, shadow, and elevation */
  flat?: boolean;
};

function GroupAvatarInner({
  avatarType,
  avatarValue,
  initials,
  size = 80,
  borderRadius = 20,
  flat = false,
}: Props) {
  const { theme } = useTheme();

  const containerStyle = [
    styles.container,
    {
      width: size,
      height: size,
      borderRadius,
      ...getShadowStyle("sm"),
    },
    flat && {
      borderWidth: 0,
      borderBottomWidth: 0,
      shadowOpacity: 0,
      elevation: 0,
    },
  ];

  const fontSize = size * 0.375;

  if (avatarType === "gradient") {
    const index = Number(avatarValue) || 0;
    const colors = AVATAR_GRADIENTS[index] ?? AVATAR_GRADIENTS[0];

    return (
      <LinearGradient
        colors={colors as unknown as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={containerStyle}
      >
        <Text style={[styles.initials, { fontSize, color: theme.colors.textInverse }]}>
          {initials}
        </Text>
      </LinearGradient>
    );
  }

  // Fallback: solid primary color
  return (
    <View style={[containerStyle, { backgroundColor: theme.colors.primary }]}>
      <Text
        style={[
          styles.initials,
          { fontSize, color: theme.colors.primaryText },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
}

export const GroupAvatar = React.memo(GroupAvatarInner);

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 0,
    borderBottomWidth: 0,
  },
  initials: {
    fontWeight: "800",
  },
});
