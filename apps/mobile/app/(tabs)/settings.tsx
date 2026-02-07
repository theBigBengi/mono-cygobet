import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { AppText, Screen, Button } from "@/components/ui";
import { useTheme } from "@/lib/theme";
import { useTranslation } from "react-i18next";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth/useAuth";

export default function SettingsScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation("common");
  const { locale, setLocale } = useI18n();
  const { logout } = useAuth();
  const router = useRouter();

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <Screen scroll>
        <AppText variant="title" style={{ marginBottom: theme.spacing.lg }}>
          {t("tabs.settings")}
        </AppText>

        <View style={[styles.languageSection, { marginTop: theme.spacing.md }]}>
          <AppText
            variant="caption"
            color="secondary"
            style={styles.languageLabel}
          >
            {t("profile.language")}
          </AppText>
          <View style={styles.languageRow}>
            <Pressable
              style={[
                styles.languageOption,
                {
                  backgroundColor:
                    locale === "en"
                      ? theme.colors.primary
                      : theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={() => void setLocale("en")}
            >
              <AppText
                variant="body"
                style={{
                  color:
                    locale === "en"
                      ? theme.colors.primaryText
                      : theme.colors.textPrimary,
                }}
              >
                {t("profile.english")}
              </AppText>
            </Pressable>
            <Pressable
              style={[
                styles.languageOption,
                {
                  backgroundColor:
                    locale === "he"
                      ? theme.colors.primary
                      : theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={() => void setLocale("he")}
            >
              <AppText
                variant="body"
                style={{
                  color:
                    locale === "he"
                      ? theme.colors.primaryText
                      : theme.colors.textPrimary,
                }}
              >
                {t("profile.hebrew")}
              </AppText>
            </Pressable>
          </View>
        </View>

        <View style={[styles.buttonSection, { marginTop: theme.spacing.lg }]}>
          <Button
            label="Tooltip Demo"
            variant="secondary"
            onPress={() => router.push("/tooltip-demo" as any)}
            style={styles.fullWidthButton}
          />
        </View>

        <View style={[styles.logoutSection, { marginTop: theme.spacing.xl }]}>
          <Button
            label={t("profile.logout")}
            variant="danger"
            onPress={() => void logout()}
            style={styles.fullWidthButton}
          />
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  languageSection: {
    width: "100%",
  },
  languageLabel: {
    marginBottom: 8,
  },
  languageRow: {
    flexDirection: "row",
    gap: 12,
  },
  languageOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  buttonSection: {
    width: "100%",
  },
  fullWidthButton: {
    width: "100%",
  },
  logoutSection: {
    width: "100%",
  },
});
