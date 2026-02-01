// components/ui/Tooltip/Tooltip.tsx
// Main Tooltip component with modal-based positioning and animations.

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  cloneElement,
  isValidElement,
} from "react";
import {
  Modal,
  Pressable,
  View,
  StyleSheet,
  Keyboard,
  Platform,
  useWindowDimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { TooltipContent } from "./TooltipContent";
import { useTooltipPosition } from "./useTooltipPosition";
import type {
  TooltipProps,
  TriggerLayout,
  TooltipSize,
} from "./tooltip.types";

const DEFAULT_PLACEMENT = "top";
const DEFAULT_OFFSET = 8;
const DEFAULT_MAX_WIDTH = 280;
const DEFAULT_ACCESSIBILITY_HINT = "Double tap for more information";

/**
 * Reusable Tooltip component. Renders the trigger (child) inside a Pressable
 * so measurement works for non-ref-forwarding children (e.g. icons). On press,
 * measures the wrapper with measureInWindow and shows a modal tooltip with
 * optional arrow, animations, and auto-dismiss.
 */
export function Tooltip({
  content,
  children,
  placement = DEFAULT_PLACEMENT,
  offset = DEFAULT_OFFSET,
  visible: controlledVisible,
  onVisibleChange,
  dismissOnTapOutside = true,
  autoDismissDelay,
  showArrow = true,
  maxWidth = DEFAULT_MAX_WIDTH,
  maxHeight,
  accessibilityLabel,
  accessibilityHint = DEFAULT_ACCESSIBILITY_HINT,
  variant,
  backgroundColor,
}: TooltipProps) {
  // Determine if controlled or uncontrolled
  const isControlled = controlledVisible !== undefined;
  const [internalVisible, setInternalVisible] = useState(false);
  const isVisible = isControlled ? controlledVisible : internalVisible;

  // State for positioning
  const [triggerLayout, setTriggerLayout] = useState<TriggerLayout | null>(null);
  const [tooltipSize, setTooltipSize] = useState<TooltipSize | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // Ref on View so measureInWindow is always available (Pressable may not forward it on all RN versions).
  const triggerRef = useRef<View>(null);
  const isMountedRef = useRef(true);
  const showCycleIdRef = useRef(0);

  const opacity = useSharedValue(0);

  // Calculate position
  const position = useTooltipPosition({
    triggerLayout,
    tooltipSize,
    placement,
    offset,
    keyboardHeight,
  });

  // Visibility change handler
  const setVisible = useCallback(
    (value: boolean) => {
      if (isControlled) {
        onVisibleChange?.(value);
      } else {
        setInternalVisible(value);
      }
    },
    [isControlled, onVisibleChange]
  );

  // Keyboard listeners
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Avoid state updates after unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Commit hide only if no new show cycle started (avoids race when toggling rapidly)
  const commitHideIfCurrentCycle = useCallback((cycleId: number) => {
    if (cycleId === showCycleIdRef.current) {
      setModalVisible(false);
      setTriggerLayout(null);
      setTooltipSize(null);
    }
  }, []);

  // Handle show/hide: short opacity-only animation
  useEffect(() => {
    if (isVisible) {
      showCycleIdRef.current += 1;
      setModalVisible(true);
      opacity.value = withTiming(1, { duration: 120 });
    } else {
      const cycleId = showCycleIdRef.current;
      opacity.value = withTiming(0, { duration: 80 }, (finished) => {
        if (finished) {
          runOnJS(commitHideIfCurrentCycle)(cycleId);
        }
      });
    }
  }, [isVisible, opacity, commitHideIfCurrentCycle]);

  // Auto-dismiss timer
  useEffect(() => {
    if (isVisible && autoDismissDelay !== undefined && autoDismissDelay > 0) {
      const timeoutId = setTimeout(() => {
        setVisible(false);
      }, autoDismissDelay);

      return () => clearTimeout(timeoutId);
    }
  }, [isVisible, autoDismissDelay, setVisible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // Measure wrapper (native Pressable) and show tooltip. Guard against unmount before callback.
  const handleTriggerPress = useCallback(() => {
    const node = triggerRef.current;
    if (node && typeof node.measureInWindow === "function") {
      node.measureInWindow((x, y, width, height) => {
        if (!isMountedRef.current) return;
        setTriggerLayout({ x, y, width, height });
        setVisible(true);
      });
    }
  }, [setVisible]);

  // Dismiss on tap outside
  const handleBackdropPress = useCallback(() => {
    if (dismissOnTapOutside) {
      setVisible(false);
    }
  }, [dismissOnTapOutside, setVisible]);

  // Handle tooltip size from TooltipContent
  const handleTooltipLayout = useCallback((size: TooltipSize) => {
    setTooltipSize(size);
  }, []);

  // When child has onPress, merge so both run (e.g. child is a Button).
  const triggerContent =
    isValidElement(children) &&
    typeof (children.props as { onPress?: () => void }).onPress === "function"
      ? cloneElement(children, {
          onPress: () => {
            (children.props as { onPress?: () => void }).onPress?.();
            handleTriggerPress();
          },
        })
      : children;

  // Re-measure trigger when orientation/dimensions change so position stays correct
  useEffect(() => {
    if (!modalVisible || !triggerRef.current) return;
    const node = triggerRef.current;
    if (typeof node.measureInWindow !== "function") return;
    node.measureInWindow((x, y, width, height) => {
      if (!isMountedRef.current) return;
      setTriggerLayout({ x, y, width, height });
    });
  }, [modalVisible, screenWidth, screenHeight]);

  return (
    <>
      <View ref={triggerRef} style={styles.triggerWrapper} collapsable={false}>
        <Pressable
          onPress={handleTriggerPress}
          accessible
          accessibilityHint={accessibilityHint}
          accessibilityState={{ expanded: isVisible }}
        >
          {triggerContent}
        </Pressable>
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.backdrop} onPress={handleBackdropPress}>
          {triggerLayout != null && (
            <Animated.View
              style={[
                styles.tooltipContainer,
                position
                  ? { top: position.top, left: position.left }
                  : styles.tooltipOffscreen,
                animatedStyle,
              ]}
              pointerEvents="auto"
              collapsable={false}
            >
              <TooltipContent
                content={content}
                placement={position?.placement ?? placement}
                arrowOffset={position?.arrowOffset ?? 0}
                showArrow={showArrow}
                maxWidth={maxWidth}
                maxHeight={maxHeight}
                variant={variant}
                backgroundColor={backgroundColor}
                onLayout={handleTooltipLayout}
                accessibilityLabel={accessibilityLabel}
              />
            </Animated.View>
          )}
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  triggerWrapper: {
    alignSelf: "flex-start",
  },
  backdrop: {
    flex: 1,
  },
  tooltipContainer: {
    position: "absolute",
  },
  tooltipOffscreen: {
    top: -10000,
    left: -10000,
  },
});
