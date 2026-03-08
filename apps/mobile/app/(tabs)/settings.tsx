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

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <Screen scroll contentContainerStyle={styles.content}>
        <AppText variant="title" style={{ marginBottom: theme.spacing.lg }}>
          {t("tabs.settings")}
        </AppText>

        {/* Account Section */}
        <Text
          style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}
        >
          {t("settings.account")}
        </Text>

        <Pressable
          onPress={() => router.push("/(tabs)/profile")}
          style={({ pressed }) => [
            styles.row,
            { opacity: pressed ? 0.6 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t("settings.profile")}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={[styles.rowLabel, { color: theme.colors.textPrimary }]}
            >
              {t("settings.profile")}
            </Text>
            {user?.username ? (
              <Text
                style={[styles.rowSub, { color: theme.colors.textSecondary }]}
              >
                @{user.username}
              </Text>
            ) : null}
          </View>
          <Ionicons
            name="chevron-forward"
            size={14}
            color={theme.colors.textSecondary + "60"}
          />
        </Pressable>

        {user?.hasPassword === true && (
          <Pressable
            onPress={() => router.push("/change-password")}
            style={({ pressed }) => [
              styles.row,
              { opacity: pressed ? 0.6 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t("settings.changePassword")}
          >
            <Text
              style={[styles.rowLabel, { color: theme.colors.textPrimary }]}
            >
              {t("settings.changePassword")}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={14}
              color={theme.colors.textSecondary + "60"}
            />
          </Pressable>
        )}

        {/* Appearance Section */}
        <Text
          style={[
            styles.sectionTitle,
            { color: theme.colors.textSecondary, marginTop: 8 },
          ]}
        >
          {t("settings.appearance")}
        </Text>

        <Pressable
          onPress={handleOpenThemeSheet}
          style={({ pressed }) => [
            styles.row,
            { opacity: pressed ? 0.6 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t("settings.theme")}
        >
          <Text style={[styles.rowLabel, { color: theme.colors.textPrimary }]}>
            {t("settings.theme")}
          </Text>
          <View style={styles.rowRight}>
            <Text
              style={[styles.rowValue, { color: theme.colors.textSecondary }]}
            >
              {currentThemeLabel}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={14}
              color={theme.colors.textSecondary + "60"}
            />
          </View>
        </Pressable>

        {/* Language picker — hidden for now
        <Pressable
          onPress={handleOpenLanguageSheet}
          style={({ pressed }) => [
            styles.row,
            { opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Text style={[styles.rowLabel, { color: theme.colors.textPrimary }]}>
            {t("profile.language")}
          </Text>
          <View style={styles.rowRight}>
            <Text
              style={[styles.rowValue, { color: theme.colors.textSecondary }]}
            >
              {currentLanguageLabel}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={14}
              color={theme.colors.textSecondary + "60"}
            />
          </View>
        </Pressable>
        */}

        {/* Preferences Section */}
        <Text
          style={[
            styles.sectionTitle,
            { color: theme.colors.textSecondary, marginTop: 8 },
          ]}
        >
          {t("settings.preferences")}
        </Text>

        <Pressable
          onPress={() => router.push("/settings/league-order")}
          style={({ pressed }) => [
            styles.row,
            { opacity: pressed ? 0.6 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t("settings.leagueOrder")}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={[styles.rowLabel, { color: theme.colors.textPrimary }]}
            >
              {t("settings.leagueOrder")}
            </Text>
            <Text
              style={[styles.rowSub, { color: theme.colors.textSecondary }]}
            >
              {t("settings.leagueOrderSubtitle")}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={14}
            color={theme.colors.textSecondary + "60"}
          />
        </Pressable>

        {Platform.OS === "ios" && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              toggleHaptics();
            }}
            style={({ pressed }) => [
              styles.row,
              { opacity: pressed ? 0.6 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t("settings.haptics")}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.rowLabel, { color: theme.colors.textPrimary }]}
              >
                {t("settings.haptics")}
              </Text>
              <Text
                style={[styles.rowSub, { color: theme.colors.textSecondary }]}
              >
                {t("settings.hapticsSubtitle")}
              </Text>
            </View>
            <View
              style={[
                styles.toggle,
                {
                  backgroundColor: hapticsEnabled
                    ? theme.colors.primary
                    : theme.colors.textSecondary + "30",
                },
              ]}
            >
              <View
                style={[
                  styles.toggleKnob,
                  { alignSelf: hapticsEnabled ? "flex-end" : "flex-start" },
                ]}
              />
            </View>
          </Pressable>
        )}

        {/* Advanced Section */}
        <Text
          style={[
            styles.sectionTitle,
            { color: theme.colors.textSecondary, marginTop: 8 },
          ]}
        >
          {t("settings.advanced")}
        </Text>

        <Pressable
          onPress={handleClearCache}
          style={({ pressed }) => [
            styles.row,
            { opacity: pressed ? 0.6 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t("settings.clearCache")}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={[styles.rowLabel, { color: theme.colors.textPrimary }]}
            >
              {t("settings.clearCache")}
            </Text>
            <Text
              style={[styles.rowSub, { color: theme.colors.textSecondary }]}
            >
              {t("settings.clearCacheSubtitle")}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={14}
            color={theme.colors.textSecondary + "60"}
          />
        </Pressable>

        {/* About Section */}
        <Text
          style={[
            styles.sectionTitle,
            { color: theme.colors.textSecondary, marginTop: 8 },
          ]}
        >
          {t("settings.about")}
        </Text>

        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: theme.colors.textPrimary }]}>
            {t("settings.version")}
          </Text>
          <Text style={[styles.rowValue, { color: theme.colors.textSecondary }]}>
            {APP_VERSION}
          </Text>
        </View>

        <Pressable
          onPress={() => Linking.openURL("https://cygobet.com/terms")}
          style={({ pressed }) => [
            styles.row,
            { opacity: pressed ? 0.6 : 1 },
          ]}
          accessibilityRole="link"
          accessibilityLabel={t("settings.termsOfService")}
        >
          <Text style={[styles.rowLabel, { color: theme.colors.textPrimary }]}>
            {t("settings.termsOfService")}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={14}
            color={theme.colors.textSecondary + "60"}
          />
        </Pressable>

        <Pressable
          onPress={() => Linking.openURL("https://cygobet.com/privacy")}
          style={({ pressed }) => [
            styles.row,
            { opacity: pressed ? 0.6 : 1 },
          ]}
          accessibilityRole="link"
          accessibilityLabel={t("settings.privacyPolicy")}
        >
          <Text style={[styles.rowLabel, { color: theme.colors.textPrimary }]}>
            {t("settings.privacyPolicy")}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={14}
            color={theme.colors.textSecondary + "60"}
          />
        </Pressable>

        {/* Logout */}
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.row,
            { opacity: pressed ? 0.6 : 1, marginTop: 8 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t("profile.logout")}
        >
          <Text style={[styles.rowLabel, { color: theme.colors.danger }]}>
            {t("profile.logout")}
          </Text>
        </Pressable>
      </Screen>

      {/* Theme Picker Bottom Sheet */}
      <BottomSheetModal
        ref={themeSheetRef}
        enableDynamicSizing
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: theme.colors.background,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary }}
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
          backgroundColor: theme.colors.background,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary }}
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
  sectionTitle: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  rowLabel: {
    fontSize: 15,
  },
  rowValue: {
    fontSize: 14,
  },
  rowSub: {
    fontSize: 11,
    marginTop: 2,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  toggle: {
    width: 34,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  toggleKnob: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#fff",
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
