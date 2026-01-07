// app/(auth)/register.tsx
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

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login, error } = useAuth();
  const router = useRouter();

  const handleRegister = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert("Error", "Please enter email and password to register");
      return;
    }

    // Derive a temporary username from email (validated and sanitized)
    const emailLocalPart = trimmedEmail.split("@")[0] || "user";
    const base = emailLocalPart.replace(/[^a-zA-Z0-9_-]/g, "");
    let derivedUsername = base || "user";
    if (derivedUsername.length < 3) {
      derivedUsername = derivedUsername.padEnd(3, "0");
    }
    if (derivedUsername.length > 40) {
      derivedUsername = derivedUsername.slice(0, 40);
    }
    // Add short suffix to reduce collision risk
    const suffix = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(2, "0");
    const finalUsername = `${derivedUsername}-${suffix}`.slice(0, 50);

    setIsLoading(true);
    try {
      await authApi.register({
        email: trimmedEmail,
        username: finalUsername,
        password: trimmedPassword,
        name: null,
      });

      // After successful registration, log the user in
      await login(trimmedEmail, trimmedPassword);

      // Navigation is handled by protected/onboarding layouts based on onboardingRequired
      router.replace("/(protected)/profile" as any);
    } catch (err) {
      console.error("Registration failed:", err);
      if (err instanceof Error) {
        Alert.alert("Error", err.message);
      } else {
        Alert.alert("Error", "Registration failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const goToLogin = () => {
    router.replace("/(auth)/login" as any);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Sign up to get started</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          editable={!isLoading}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Register</Text>
          )}
        </Pressable>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleText}>Already have an account?</Text>
          <Pressable onPress={goToLogin} disabled={isLoading}>
            <Text style={styles.toggleLink}>Log in</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 32,
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
  form: {
    width: "100%",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: "#fff",
  },
  error: {
    color: "#FF3B30",
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 14,
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
  toggleRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  toggleText: {
    fontSize: 14,
    color: "#666",
    marginRight: 4,
  },
  toggleLink: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "600",
  },
});
