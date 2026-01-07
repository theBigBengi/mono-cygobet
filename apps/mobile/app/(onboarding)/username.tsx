// app/(onboarding)/username.tsx
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth/useAuth";
import * as authApi from "@/lib/auth/auth.api";

export default function UsernameScreen() {
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { user, bootstrap } = useAuth();
  const router = useRouter();

  const handleComplete = async () => {
    const trimmedUsername = username.trim();

    if (!trimmedUsername || trimmedUsername.length < 3) {
      Alert.alert("Error", "Username must be at least 3 characters long");
      return;
    }

    if (trimmedUsername.length > 50) {
      Alert.alert("Error", "Username must be at most 50 characters long");
      return;
    }

    // Validate format (alphanumeric, underscore, hyphen)
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(trimmedUsername)) {
      Alert.alert(
        "Error",
        "Username can only contain letters, numbers, underscores, and hyphens"
      );
      return;
    }

    setIsLoading(true);
    try {
      await authApi.completeOnboarding(trimmedUsername);
      // Refresh user data to get updated onboardingRequired status
      await bootstrap();
      // Navigate to protected app
      router.replace("/(protected)/account" as any);
    } catch (err) {
      console.error("Onboarding completion failed:", err);
      if (err instanceof Error) {
        Alert.alert("Error", err.message);
      } else {
        Alert.alert(
          "Error",
          "Failed to complete onboarding. Please try again."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Complete Your Profile</Text>
      <Text style={styles.subtitle}>Choose a username to get started</Text>

      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!isLoading}
      />

      <Text style={styles.hint}>
        3-50 characters. Letters, numbers, underscores, and hyphens only.
      </Text>

      <Pressable
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleComplete}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Complete</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 32,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: "#999",
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
