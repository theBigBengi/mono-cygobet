// app/sign-up.tsx
// Sign-up screen - always accessible, redirects to home after successful registration

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
import { useTheme } from "@/lib/theme";
import * as authApi from "@/lib/auth/auth.api";

export default function SignUpScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login, error, applyAuthResult } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  const handleRegister = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert("Error", "Please enter email and password to register");
      return;
    }

    // Basic email validation
    if (!trimmedEmail.includes("@")) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    try {
      // Register the user (username is optional)
      const response = await authApi.register({
        email: trimmedEmail,
        password: trimmedPassword,
        name: null,
      });

      // Treat the register response as the authenticated result.
      // Apply tokens and user into AuthProvider without calling login().
      await applyAuthResult(response);

      // After successful auth application, index.tsx will handle redirect
      // - If user has username: redirects to /(tabs)/home
      // - If user has no username: redirects to /username
      router.replace("/");
    } catch (err) {
      console.error("Registration failed:", err);
      // Error will be set in auth context
    } finally {
      setIsLoading(false);
    }
  };

  const goToSignIn = () => {
    router.replace("/sign-in");
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      <Text
        style={[
          styles.title,
          {
            color: theme.colors.textPrimary,
          },
        ]}
      >
        Create Account
      </Text>
      <Text
        style={[
          styles.subtitle,
          {
            color: theme.colors.textSecondary,
          },
        ]}
      >
        Sign up to get started
      </Text>

      <View style={styles.form}>
        <TextInput
          style={[
            styles.input,
            {
              borderColor: theme.colors.border,
              color: theme.colors.textPrimary,
              backgroundColor: theme.colors.surface,
            },
          ]}
          placeholder="Email"
          placeholderTextColor={theme.colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          editable={!isLoading}
        />

        <TextInput
          style={[
            styles.input,
            {
              borderColor: theme.colors.border,
              color: theme.colors.textPrimary,
              backgroundColor: theme.colors.surface,
            },
          ]}
          placeholder="Password"
          placeholderTextColor={theme.colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
        />

        {error && (
          <Text
            style={[
              styles.error,
              {
                color: theme.colors.danger,
              },
            ]}
          >
            {error}
          </Text>
        )}

        <Pressable
          style={[
            styles.button,
            {
              backgroundColor: theme.colors.primary,
            },
            isLoading && styles.buttonDisabled,
          ]}
          onPress={handleRegister}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign Up</Text>
          )}
        </Pressable>

        <View style={styles.toggleRow}>
          <Text
            style={[
              styles.toggleText,
              {
                color: theme.colors.textSecondary,
              },
            ]}
          >
            Already have an account?
          </Text>
          <Pressable onPress={goToSignIn} disabled={isLoading}>
            <Text
              style={[
                styles.toggleLink,
                {
                  color: theme.colors.primary,
                },
              ]}
            >
              Sign In
            </Text>
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
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
    textAlign: "center",
  },
  form: {
    width: "100%",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  error: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
  },
  button: {
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
    marginRight: 4,
  },
  toggleLink: {
    fontSize: 14,
    fontWeight: "600",
  },
});
