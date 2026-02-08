import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

export function SectionTooltip({
  text,
  contentClassName,
}: {
  text: string;
  contentClassName?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help shrink-0" />
      </TooltipTrigger>
      <TooltipContent side="top" className={contentClassName ?? "max-w-xs"}>
        <p className="text-sm whitespace-pre-line">{text}</p>
      </TooltipContent>
    </Tooltip>
  );
}
