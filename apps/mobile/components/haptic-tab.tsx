import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { PlatformPressable } from "@react-navigation/elements";
import { triggerImpact, ImpactFeedbackStyle } from "@/lib/haptics";

export function HapticTab(props: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        void triggerImpact(ImpactFeedbackStyle.Light);
        props.onPressIn?.(ev);
      }}
    />
  );
}
