// app/(tabs)/_layout.tsx
// Tabs navigator - home and groups tabs
// Protected by Stack.Protected in root _layout.tsx

import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { FloatingTabBar } from "@/components/FloatingTabBar";

export default function TabsLayout() {
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  return (
    <Tabs
      initialRouteName="groups"
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          display: "none", // Hide default tab bar, we use custom one
        },
      }}
    >
      <Tabs.Screen
        name="groups"
        options={{
          title: t("tabs.groups"),
          tabBarLabel: t("tabs.groups"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="activity" options={{ href: null }} />
      <Tabs.Screen name="home" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen
        name="journey"
        options={{
          title: t("tabs.journey"),
          tabBarLabel: t("tabs.journey"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trail-sign-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t("tabs.settings"),
          tabBarLabel: t("tabs.settings"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
