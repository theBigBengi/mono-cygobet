// components/QueryState/QueryLoadingView.tsx
import React from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";

interface QueryLoadingViewProps {
  message?: string;
}

export function QueryLoadingView({ message }: QueryLoadingViewProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  message: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
});
