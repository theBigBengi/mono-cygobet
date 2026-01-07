// components/QueryState/QueryLoadingView.tsx
// Loading state component using UI layer.
import React from "react";
import { ActivityIndicator } from "react-native";
import { Screen, AppText } from "@/components/ui";
import { sharedStyles } from "@/components/ui/styles";

interface QueryLoadingViewProps {
  message?: string;
}

export function QueryLoadingView({ message }: QueryLoadingViewProps) {
  return (
    <Screen>
      <ActivityIndicator size="large" />
      {message ? (
        <AppText
          variant="body"
          color="secondary"
          style={sharedStyles.emptyTextMargin}
        >
          {message}
        </AppText>
      ) : null}
    </Screen>
  );
}
