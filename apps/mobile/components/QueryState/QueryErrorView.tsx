// components/QueryState/QueryErrorView.tsx
// Error state component using UI layer.
import React from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("common");
  return (
    <Screen>
      <AppText variant="body" color="danger" style={sharedStyles.emptyTextMargin}>
        {message}
      </AppText>

      {onRetry ? (
        <Button
          label={t("common.retry")}
          onPress={onRetry}
          style={sharedStyles.buttonContainer}
        />
      ) : null}

      {extraActions}
    </Screen>
  );
}
