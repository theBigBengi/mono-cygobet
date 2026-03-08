// app/(tabs)/home.tsx
// Hidden tab — kept for Expo Router but redirects to groups.

import { Redirect } from "expo-router";

export default function HomeScreen() {
  return <Redirect href="/(tabs)/groups" />;
}
