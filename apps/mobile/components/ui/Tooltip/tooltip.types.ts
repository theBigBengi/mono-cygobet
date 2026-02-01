// components/ui/Tooltip/tooltip.types.ts
// Type definitions for Tooltip component.

import type { ReactNode, ReactElement } from "react";

/**
 * Tooltip placement options relative to the trigger element.
 */
export type TooltipPlacement = "top" | "bottom" | "left" | "right";

/**
 * Visual variant for tooltip background (maps to theme colors when available).
 */
export type TooltipVariant = "default" | "info" | "warning";

/**
 * Props for the Tooltip component.
 */
export interface TooltipProps {
  /** Content to display in the tooltip. Can be a string or JSX. */
  content: ReactNode;
  /** Trigger element that will show the tooltip on press. Wrapped in a Pressable for measurement. */
  children: ReactElement;
  /** Preferred placement of the tooltip relative to trigger. Default: 'top' */
  placement?: TooltipPlacement;
  /** Distance from trigger element in pixels. Default: 8 */
  offset?: number;
  /** Controlled visibility state. If provided, component is controlled. */
  visible?: boolean;
  /** Callback when visibility changes (for controlled mode). */
  onVisibleChange?: (visible: boolean) => void;
  /** Whether to dismiss when tapping outside the tooltip. Default: true */
  dismissOnTapOutside?: boolean;
  /** Auto-dismiss after this many milliseconds. Undefined = no auto-dismiss. */
  autoDismissDelay?: number;
  /** Whether to show the directional arrow. Default: true */
  showArrow?: boolean;
  /** Maximum width of the tooltip. Default: 280 */
  maxWidth?: number;
  /** Maximum height of the tooltip; content scrolls when exceeded. Default: 280 */
  maxHeight?: number;
  /** Accessibility label for the tooltip content. */
  accessibilityLabel?: string;
  /** Accessibility hint for the trigger. Default: "Double tap for more information" */
  accessibilityHint?: string;
  /** Visual variant (default uses theme.colors.primary). */
  variant?: TooltipVariant;
  /** Override background color; takes precedence over variant. */
  backgroundColor?: string;
}

/**
 * Layout information for the trigger element.
 * Coordinates are absolute screen position from measureInWindow.
 */
export interface TriggerLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Computed position for the tooltip.
 */
export interface TooltipPosition {
  top: number;
  left: number;
  /** Offset for the arrow from the edge of the tooltip (to point at trigger center). */
  arrowOffset: number;
  /** Final placement after auto-adjustment (may differ from requested). */
  placement: TooltipPlacement;
}

/**
 * Size of the tooltip content for positioning calculations.
 */
export interface TooltipSize {
  width: number;
  height: number;
}
