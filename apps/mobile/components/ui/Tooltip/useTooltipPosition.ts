// components/ui/Tooltip/useTooltipPosition.ts
// Hook for calculating tooltip position with auto-adjustment.

import { useMemo } from "react";
import { useWindowDimensions } from "react-native";
import type {
  TriggerLayout,
  TooltipSize,
  TooltipPosition,
  TooltipPlacement,
} from "./tooltip.types";

/** Minimum padding from screen edges. */
const SCREEN_PADDING = 8;

interface UseTooltipPositionParams {
  triggerLayout: TriggerLayout | null;
  tooltipSize: TooltipSize | null;
  placement: TooltipPlacement;
  offset: number;
  keyboardHeight?: number;
}

/**
 * Calculates tooltip position relative to the trigger with edge detection and
 * auto-adjustment (flip/clamp). Uses primitive dependencies so position
 * only recalculates when layout or dimensions actually change.
 *
 * @param params - Trigger layout, tooltip size, preferred placement, offset, keyboard height
 * @returns Computed position with final placement, or null if not ready
 */
export function useTooltipPosition({
  triggerLayout,
  tooltipSize,
  placement,
  offset,
  keyboardHeight = 0,
}: UseTooltipPositionParams): TooltipPosition | null {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const effectiveScreenHeight = screenHeight - keyboardHeight;

  // Primitive deps avoid unnecessary recalc when triggerLayout/tooltipSize are new refs but same values
  const hasTrigger = !!triggerLayout;
  const hasSize = !!tooltipSize;
  const tx = triggerLayout?.x ?? 0;
  const ty = triggerLayout?.y ?? 0;
  const tw = triggerLayout?.width ?? 0;
  const th = triggerLayout?.height ?? 0;
  const ttipW = tooltipSize?.width ?? 0;
  const ttipH = tooltipSize?.height ?? 0;

  return useMemo(() => {
    if (!hasTrigger || !hasSize) return null;

    const triggerX = tx;
    const triggerY = ty;
    const triggerW = tw;
    const triggerH = th;
    const tooltipW = ttipW;
    const tooltipH = ttipH;

    // Calculate trigger center
    const triggerCenterX = triggerX + triggerW / 2;
    const triggerCenterY = triggerY + triggerH / 2;

    let finalPlacement = placement;
    let top = 0;
    let left = 0;
    let arrowOffset = 0;

    // Calculate initial position based on placement
    const calculatePosition = (p: TooltipPlacement) => {
      switch (p) {
        case "top":
          return {
            top: triggerY - tooltipH - offset,
            left: triggerCenterX - tooltipW / 2,
          };
        case "bottom":
          return {
            top: triggerY + triggerH + offset,
            left: triggerCenterX - tooltipW / 2,
          };
        case "left":
          return {
            top: triggerCenterY - tooltipH / 2,
            left: triggerX - tooltipW - offset,
          };
        case "right":
          return {
            top: triggerCenterY - tooltipH / 2,
            left: triggerX + triggerW + offset,
          };
      }
    };

    let pos = calculatePosition(placement);

    // Check for vertical overflow and flip if needed
    if (placement === "top" && pos.top < SCREEN_PADDING) {
      // Flip to bottom
      finalPlacement = "bottom";
      pos = calculatePosition("bottom");
    } else if (placement === "bottom" && pos.top + tooltipH > effectiveScreenHeight - SCREEN_PADDING) {
      // Flip to top
      finalPlacement = "top";
      pos = calculatePosition("top");
    }

    // Check for horizontal overflow and flip if needed
    if (placement === "left" && pos.left < SCREEN_PADDING) {
      // Flip to right
      finalPlacement = "right";
      pos = calculatePosition("right");
    } else if (placement === "right" && pos.left + tooltipW > screenWidth - SCREEN_PADDING) {
      // Flip to left
      finalPlacement = "left";
      pos = calculatePosition("left");
    }

    top = pos.top;
    left = pos.left;

    // Clamp horizontal position for top/bottom placements
    if (finalPlacement === "top" || finalPlacement === "bottom") {
      const minLeft = SCREEN_PADDING;
      const maxLeft = screenWidth - tooltipW - SCREEN_PADDING;

      if (left < minLeft) {
        left = minLeft;
      } else if (left > maxLeft) {
        left = maxLeft;
      }

      // Calculate arrow offset to point at trigger center
      // Arrow should be at triggerCenterX relative to tooltip left
      arrowOffset = triggerCenterX - left;
      // Clamp arrow offset to stay within tooltip bounds (with some padding)
      const arrowPadding = 12;
      arrowOffset = Math.max(arrowPadding, Math.min(tooltipW - arrowPadding, arrowOffset));
    }

    // Clamp vertical position for left/right placements
    if (finalPlacement === "left" || finalPlacement === "right") {
      const minTop = SCREEN_PADDING;
      const maxTop = effectiveScreenHeight - tooltipH - SCREEN_PADDING;

      if (top < minTop) {
        top = minTop;
      } else if (top > maxTop) {
        top = maxTop;
      }

      // Calculate arrow offset to point at trigger center
      // Arrow should be at triggerCenterY relative to tooltip top
      arrowOffset = triggerCenterY - top;
      // Clamp arrow offset to stay within tooltip bounds
      const arrowPadding = 12;
      arrowOffset = Math.max(arrowPadding, Math.min(tooltipH - arrowPadding, arrowOffset));
    }

    return {
      top,
      left,
      arrowOffset,
      placement: finalPlacement,
    };
  }, [
    hasTrigger,
    hasSize,
    tx,
    ty,
    tw,
    th,
    ttipW,
    ttipH,
    placement,
    offset,
    screenWidth,
    effectiveScreenHeight,
  ]);
}
