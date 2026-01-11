// app/(protected)/explore.tsx
// Explore tab screen (placeholder).
// This is the middle tab in the bottom tabs navigation.

import { Screen, AppText } from "@/components/ui";
import { useAppBarConfig } from "@/app-shell/appbar";
import { sharedStyles } from "@/components/ui/styles";

export default function ExploreScreen() {
  // Configure AppBar for this screen
  useAppBarConfig({
    visible: true,
    variant: "default",
    slots: {
      center: <AppText variant="subtitle">Explore</AppText>,
    },
  });

  return (
    <Screen scroll>
      <AppText variant="title" style={sharedStyles.titleMargin}>
        Explore
      </AppText>
      <AppText variant="body" color="secondary">
        This is a placeholder screen for the Explore tab.
      </AppText>
    </Screen>
  );
}
