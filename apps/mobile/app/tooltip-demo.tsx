// app/tooltip-demo.tsx
// Demo screen for Tooltip component examples.

import { TooltipExample } from "@/components/ui/Tooltip/TooltipExample";
import { ScreenWithHeader } from "@/components/ui";

export default function TooltipDemoScreen() {
  return (
    <ScreenWithHeader title="Tooltip Demo">
      <TooltipExample />
    </ScreenWithHeader>
  );
}
