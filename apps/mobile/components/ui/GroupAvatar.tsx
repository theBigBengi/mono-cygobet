import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/lib/theme";
import { AVATAR_GRADIENTS } from "@/lib/constants/avatarGradients";

type Props = {
  avatarType?: string | null;
  avatarValue?: string | null;
  initials: string;
  size?: number;
  borderRadius?: number;
};

function GroupAvatarInner({
  avatarType,
  avatarValue,
  initials,
  size = 80,
  borderRadius = 20,
}: Props) {
  const { theme } = useTheme();

  const containerStyle = [
    styles.container,
    {
      width: size,
      height: size,
      borderRadius,
      shadowColor: "#000",
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
        <Text style={[styles.initials, { fontSize, color: "#fff" }]}>
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
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderBottomWidth: 4,
    borderBottomColor: "rgba(0,0,0,0.15)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  initials: {
    fontWeight: "800",
  },
});
