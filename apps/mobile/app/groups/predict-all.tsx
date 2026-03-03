// app/groups/predict-all.tsx
// Predict All — swipe through all unpredicted games across all groups.

import React from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PredictAllScreen } from "@/features/groups/predictions/screens/PredictAllScreen";

export default function PredictAllRoute() {
  return (
    <ErrorBoundary feature="predict-all">
      <PredictAllScreen />
    </ErrorBoundary>
  );
}
