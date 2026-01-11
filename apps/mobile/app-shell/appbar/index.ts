// src/app-shell/appbar/index.ts
// Barrel exports for AppBar module.
// Only exports public API - internal store implementation is hidden.

// Components
export { AppBar } from "./AppBar";
export { AppBarProvider } from "./AppBarProvider";

// Screen configuration hook (ONLY public API for screens)
export { useAppBarConfig } from "./useAppBarConfig";

// Internal components (for AppBar slots)
export { AppBarButton } from "./AppBarButton";

// Types (public API)
export type {
  AppBarConfig,
  AppBarVariant,
  AppBarStyleOverrides,
  PartialAppBarConfig,
} from "./AppBar.types";

// Default config (for resetting)
export { defaultAppBarConfig } from "./AppBar.types";

// Constants (for reference)
export { RESERVED_SIDE_WIDTH, MIN_TOUCH_TARGET_SIZE } from "./AppBar.constants";

// Do NOT export internal implementation details:
// - appBar.store.ts (internal hooks)
// - appBar.presets.ts functions
// - appBar.utils.ts functions
// - Internal context/store structure
//
// Screens should ONLY use useAppBarConfig() to configure AppBar.
