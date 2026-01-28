// app/(tabs)/profile.tsx
// Profile tab - displays user profile information
// Currently shows the username

import React from "react";
import { View, StyleSheet } from "react-native";
import { Screen, AppText, Button } from "@/components/ui";
import { useAuth } from "@/lib/auth/useAuth";

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.root}>
      <Screen>
        <View style={styles.container}>
          <AppText variant="title" style={styles.title}>
            Profile
          </AppText>
          <View style={styles.usernameContainer}>
            <AppText variant="body" color="secondary" style={styles.label}>
              Username
            </AppText>
            <AppText variant="title" style={styles.username}>
              {user?.username || "No username set"}
            </AppText>
          </View>
          <View style={styles.logoutContainer}>
            <Button
              label="Logout"
              variant="danger"
              onPress={() => void logout()}
              style={styles.logoutButton}
            />
          </View>
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    marginBottom: 32,
    textAlign: "center",
  },
  usernameContainer: {
    alignItems: "center",
  },
  label: {
    marginBottom: 8,
    textAlign: "center",
  },
  username: {
    textAlign: "center",
  },
  logoutContainer: {
    marginTop: 48,
    width: "100%",
    paddingHorizontal: 24,
  },
  logoutButton: {
    width: "100%",
  },
});
