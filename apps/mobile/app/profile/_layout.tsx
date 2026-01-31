// app/profile/_layout.tsx
// Stack layout for profile sub-routes (head-to-head, etc.)

import { Stack } from "expo-router";

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
