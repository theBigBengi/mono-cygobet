// src/app-shell/appbar/AppBar.types.ts
// All types for the AppBar system.
// No business logic, only type definitions.

import type { ReactNode } from "react";

/**
 * AppBar preset variant names.
 * Each preset defines a complete appearance (background, border, elevation, text color).
 */
export type AppBarVariant = "default" | "transparent" | "elevated";

/**
 * Allowed style overrides.
 * Screens can override only these specific properties.
 * Prevents arbitrary style dumping.
 */
export interface AppBarStyleOverrides {
  backgroundColor?: string;
  borderBottomWidth?: number;
  borderBottomColor?: string;
  height?: number;
}

/**
 * AppBar configuration object.
 * This is what the store holds and screens set.
 */
export interface AppBarConfig {
  /** Whether the AppBar is visible */
  visible: boolean;
  /** Preset variant that defines the overall appearance */
  variant: AppBarVariant;
  /** Limited style overrides (only whitelisted properties) */
  styleOverrides?: AppBarStyleOverrides;
  /** Slot content (ReactNodes) */
  slots: {
    /** Left slot (typically back button or icon) */
    left?: ReactNode;
    /** Center slot (typically title or custom component) */
    center?: ReactNode;
    /** Right slot (typically actions or icons) */
    right?: ReactNode;
  };
}

/**
 * Partial AppBar config for merging.
 * All properties are optional.
 */
export type PartialAppBarConfig = Partial<Omit<AppBarConfig, "slots">> & {
  slots?: Partial<AppBarConfig["slots"]>;
};

/**
 * Default AppBar configuration.
 */
export const defaultAppBarConfig: AppBarConfig = {
  visible: true,
  variant: "default",
  slots: {},
};
