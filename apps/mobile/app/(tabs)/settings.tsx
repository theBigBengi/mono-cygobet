import React from "react";
import { View, StyleSheet, Alert, Platform, Linking } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";

import { Screen, AppText } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth/useAuth";
import { useSettings } from "@/lib/settings";
import {
  SettingsSection,
  SettingsRow,
  SettingsRowPicker,
} from "@/features/settings";

import type { ThemeMode } from "@/lib/theme/theme.types";
import type { Locale } from "@/lib/i18n/i18n.types";

const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";

export default function SettingsScreen() {
  const { t } = useTranslation("common");
  const { theme, mode, setMode } = useTheme();
  const { locale, setLocale } = useI18n();
  const { logout, user } = useAuth();
  const { hapticsEnabled, toggleHaptics } = useSettings();
  const queryClient = useQueryClient();
  const router = useRouter();

  const themeModeOptions: { value: ThemeMode; label: string }[] = [
    { value: "system", label: t("settings.themeSystem") },
    { value: "light", label: t("settings.themeLight") },
    { value: "dark", label: t("settings.themeDark") },
  ];

  const languageOptions: { value: Locale; label: string }[] = [
    { value: "en", label: t("profile.english") },
    { value: "he", label: t("profile.hebrew") },
  ];

  const handleClearCache = () => {
    Alert.alert(t("settings.clearCache"), t("settings.clearCacheConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("settings.clear"),
        style: "destructive",
        onPress: () => {
          queryClient.clear();
          Alert.alert(t("settings.done"), t("settings.cacheCleared"));
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert(t("profile.logout"), t("settings.logoutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("profile.logout"),
        style: "destructive",
        onPress: () => void logout(),
      },
    ]);
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <Screen scroll contentContainerStyle={styles.content}>
        <AppText variant="title" style={{ marginBottom: theme.spacing.lg }}>
          {t("tabs.settings")}
        </AppText>

        {/* Account Section */}
        <SettingsSection title={t("settings.account")}>
          <SettingsRow
            type="navigation"
            icon="person-outline"
            label={t("settings.profile")}
            subtitle={user?.username ? `@${user.username}` : undefined}
            onPress={() => router.push("/(tabs)/profile")}
          />
          <SettingsRow
            type="navigation"
            icon="log-out-outline"
            label={t("profile.logout")}
            onPress={handleLogout}
            isLast
          />
        </SettingsSection>

        {/* Appearance Section */}
        <SettingsSection title={t("settings.appearance")}>
          <SettingsRowPicker
            icon="moon-outline"
            label={t("settings.theme")}
            value={mode}
            options={themeModeOptions}
            onValueChange={setMode}
          />
          <SettingsRowPicker
            icon="language-outline"
            label={t("profile.language")}
            value={locale}
            options={languageOptions}
            onValueChange={(val) => void setLocale(val)}
            isLast
          />
        </SettingsSection>

        {/* Preferences Section - iOS only for haptics */}
        {Platform.OS === "ios" && (
          <SettingsSection title={t("settings.preferences")}>
            <SettingsRow
              type="toggle"
              icon="phone-portrait-outline"
              label={t("settings.haptics")}
              subtitle={t("settings.hapticsSubtitle")}
              value={hapticsEnabled}
              onValueChange={toggleHaptics}
              isLast
            />
          </SettingsSection>
        )}

        {/* Advanced Section */}
        <SettingsSection title={t("settings.advanced")}>
          <SettingsRow
            type="navigation"
            icon="trash-outline"
            label={t("settings.clearCache")}
            subtitle={t("settings.clearCacheSubtitle")}
            onPress={handleClearCache}
            isLast
          />
        </SettingsSection>

        {/* About Section */}
        <SettingsSection title={t("settings.about")}>
          <SettingsRow
            type="value"
            icon="information-circle-outline"
            label={t("settings.version")}
            value={APP_VERSION}
          />
          <SettingsRow
            type="navigation"
            icon="document-text-outline"
            label={t("settings.termsOfService")}
            onPress={() => Linking.openURL("https://cygobet.com/terms")}
          />
          <SettingsRow
            type="navigation"
            icon="shield-checkmark-outline"
            label={t("settings.privacyPolicy")}
            onPress={() => Linking.openURL("https://cygobet.com/privacy")}
            isLast
          />
        </SettingsSection>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
});
