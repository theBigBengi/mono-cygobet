// components/QueryState/QueryErrorView.tsx
// Error state component using UI layer.
import React from "react";
import { Screen, AppText, Button } from "@/components/ui";
import { sharedStyles } from "@/components/ui/styles";

interface QueryErrorViewProps {
  message: string;
  onRetry?: () => void;
  extraActions?: React.ReactNode;
}

export function QueryErrorView({
  message,
  onRetry,
  extraActions,
}: QueryErrorViewProps) {
  return (
    <Screen>
      <AppText variant="body" color="danger" style={sharedStyles.emptyTextMargin}>
        {message}
      </AppText>

      {onRetry ? (
        <Button label="Retry" onPress={onRetry} style={sharedStyles.buttonContainer} />
      ) : null}

      {extraActions}
    </Screen>
  );
}
