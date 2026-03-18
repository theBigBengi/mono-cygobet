import React, { useRef, useCallback, useState } from "react";
import {
  View,
  StyleSheet,
  Alert,
  Platform,
  Linking,
  Pressable,
  Text,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";

import { Screen, AppText } from "@/components/ui";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useTheme } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth/useAuth";
import { useSettings } from "@/lib/settings";
import { SettingsSection } from "@/features/settings/components/SettingsSection";
import { SettingsRow } from "@/features/settings/components/SettingsRow";

import type { ThemeMode } from "@/lib/theme/theme.types";
import type { Locale } from "@/lib/i18n/i18n.types";

const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";

export default function SettingsScreen() {
  return (
    <ErrorBoundary feature="settings">
      <SettingsContent />
    </ErrorBoundary>
  );
}

function SettingsContent() {
  const { t } = useTranslation("common");
  const { theme, mode, setMode } = useTheme();
  const { locale, setLocale } = useI18n();
  const { logout, user } = useAuth();
  const { hapticsEnabled, toggleHaptics } = useSettings();
  const queryClient = useQueryClient();
  const router = useRouter();

  // Bottom sheet refs
  const themeSheetRef = useRef<BottomSheetModal>(null);
  const languageSheetRef = useRef<BottomSheetModal>(null);

  // Draft state for sheets (applied only on Done)
  const [draftMode, setDraftMode] = useState(mode);
  const [draftLocale, setDraftLocale] = useState(locale);

  const themeModeOptions: { value: ThemeMode; label: string }[] = [
    { value: "system", label: t("settings.themeSystem") },
    { value: "light", label: t("settings.themeLight") },
    { value: "dark", label: t("settings.themeDark") },
  ];

  const languageOptions: { value: Locale; label: string }[] = [
    { value: "en", label: t("profile.english") },
    { value: "he", label: t("profile.hebrew") },
  ];

  const currentThemeLabel =
    themeModeOptions.find((o) => o.value === mode)?.label ?? mode;
  const currentLanguageLabel =
    languageOptions.find((o) => o.value === locale)?.label ?? locale;

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  const handleOpenThemeSheet = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDraftMode(mode);
    themeSheetRef.current?.present();
  }, [mode]);

  const handleOpenLanguageSheet = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDraftLocale(locale);
    languageSheetRef.current?.present();
  }, [locale]);

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

  const showChangePassword = user?.hasPassword === true;
  const showHaptics = Platform.OS === "ios";

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
            isLast={!showChangePassword}
          />
          {showChangePassword && (
            <SettingsRow
              type="navigation"
              icon="key-outline"
              label={t("settings.changePassword")}
              onPress={() => router.push("/change-password")}
              isLast
            />
          )}
        </SettingsSection>

        {/* Appearance Section */}
        <SettingsSection title={t("settings.appearance")}>
          <SettingsRow
            type="value"
            icon="moon-outline"
            label={t("settings.theme")}
            value={currentThemeLabel}
            onPress={handleOpenThemeSheet}
          />
          <SettingsRow
            type="value"
            icon="language-outline"
            label={t("profile.language")}
            value={currentLanguageLabel}
            onPress={handleOpenLanguageSheet}
            isLast
          />
        </SettingsSection>

        {/* Preferences Section */}
        <SettingsSection title={t("settings.preferences")}>
          <SettingsRow
            type="navigation"
            icon="reorder-three-outline"
            label={t("settings.leagueOrder")}
            subtitle={t("settings.leagueOrderSubtitle")}
            onPress={() => router.push("/settings/league-order")}
            isLast={!showHaptics}
          />
          {showHaptics && (
            <SettingsRow
              type="toggle"
              icon="hand-left-outline"
              label={t("settings.haptics")}
              subtitle={t("settings.hapticsSubtitle")}
              value={hapticsEnabled}
              onValueChange={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                toggleHaptics();
              }}
              isLast
            />
          )}
        </SettingsSection>

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

        {/* Logout Section */}
        <SettingsSection>
          <SettingsRow
            type="navigation"
            icon="log-out-outline"
            label={t("profile.logout")}
            onPress={handleLogout}
            danger
            isLast
          />
        </SettingsSection>
      </Screen>

      {/* Theme Picker Bottom Sheet */}
      <BottomSheetModal
        ref={themeSheetRef}
        enableDynamicSizing
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: theme.colors.surfaceElevated,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
        handleIndicatorStyle={{
          backgroundColor: theme.colors.textDisabled,
          width: 36,
          height: 4,
        }}
      >
        <BottomSheetView style={styles.sheetContent}>
          <Text
            style={[
              styles.sheetTitle,
              {
                color: theme.colors.textPrimary,
                borderBottomColor: theme.colors.textPrimary + "10",
              },
            ]}
          >
            {t("settings.theme")}
          </Text>
          {themeModeOptions.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setDraftMode(opt.value);
              }}
              style={({ pressed }) => [
                styles.sheetOption,
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Text
                style={[
                  styles.sheetOptionLabel,
                  { color: theme.colors.textPrimary },
                ]}
              >
                {opt.label}
              </Text>
              <Ionicons
                name={
                  opt.value === draftMode
                    ? "radio-button-on"
                    : "radio-button-off"
                }
                size={18}
                color={
                  opt.value === draftMode
                    ? theme.colors.primary
                    : theme.colors.textSecondary
                }
              />
            </Pressable>
          ))}
          <Pressable
            onPress={() => {
              setMode(draftMode);
              themeSheetRef.current?.dismiss();
            }}
            disabled={draftMode === mode}
            style={({ pressed }) => [
              styles.sheetDoneBtn,
              {
                backgroundColor: theme.colors.primary,
                opacity:
                  draftMode === mode
                    ? 0.4
                    : pressed
                      ? 0.8
                      : 1,
              },
            ]}
          >
            <Text style={[styles.sheetDoneBtnText, { color: theme.colors.textInverse }]}>{t("done")}</Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>

      {/* Language Picker Bottom Sheet */}
      <BottomSheetModal
        ref={languageSheetRef}
        enableDynamicSizing
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: theme.colors.surfaceElevated,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
        handleIndicatorStyle={{
          backgroundColor: theme.colors.textDisabled,
          width: 36,
          height: 4,
        }}
      >
        <BottomSheetView style={styles.sheetContent}>
          <Text
            style={[
              styles.sheetTitle,
              {
                color: theme.colors.textPrimary,
                borderBottomColor: theme.colors.textPrimary + "10",
              },
            ]}
          >
            {t("profile.language")}
          </Text>
          {languageOptions.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setDraftLocale(opt.value);
              }}
              style={({ pressed }) => [
                styles.sheetOption,
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Text
                style={[
                  styles.sheetOptionLabel,
                  { color: theme.colors.textPrimary },
                ]}
              >
                {opt.label}
              </Text>
              <Ionicons
                name={
                  opt.value === draftLocale
                    ? "radio-button-on"
                    : "radio-button-off"
                }
                size={18}
                color={
                  opt.value === draftLocale
                    ? theme.colors.primary
                    : theme.colors.textSecondary
                }
              />
            </Pressable>
          ))}
          <Pressable
            onPress={() => {
              void setLocale(draftLocale);
              languageSheetRef.current?.dismiss();
            }}
            disabled={draftLocale === locale}
            style={({ pressed }) => [
              styles.sheetDoneBtn,
              {
                backgroundColor: theme.colors.primary,
                opacity:
                  draftLocale === locale
                    ? 0.4
                    : pressed
                      ? 0.8
                      : 1,
              },
            ]}
          >
            <Text style={[styles.sheetDoneBtnText, { color: theme.colors.textInverse }]}>{t("done")}</Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    paddingBottom: 12,
    marginBottom: 8,
    borderBottomWidth: 1,
  },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  sheetOptionLabel: {
    fontSize: 14,
  },
  sheetDoneBtn: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  sheetDoneBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
