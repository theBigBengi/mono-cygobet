import { Badge } from "@/components/ui/badge";

type UnifiedStatus =
  | "missing-in-db"
  | "mismatch"
  | "extra-in-db"
  | "ok"
  | "new";

type BatchStatus = "success" | "failed" | "pending" | "running";

interface StatusBadgeProps {
  status: UnifiedStatus | BatchStatus | string;
  className?: string;
}

const unifiedStatusConfig: Record<
  UnifiedStatus,
  {
    label: string;
    variant: "destructive" | "secondary" | "default";
  }
> = {
  "missing-in-db": { label: "Missing", variant: "destructive" },
  mismatch: { label: "Mismatch", variant: "destructive" },
  "extra-in-db": { label: "Extra", variant: "secondary" },
  ok: { label: "OK", variant: "default" },
  new: { label: "New", variant: "secondary" },
};

const batchStatusConfig: Record<
  BatchStatus,
  {
    variant: "destructive" | "secondary" | "default";
  }
> = {
  success: { variant: "default" },
  failed: { variant: "destructive" },
  pending: { variant: "secondary" },
  running: { variant: "secondary" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  // Check if it's a unified status
  if (status in unifiedStatusConfig) {
    const config = unifiedStatusConfig[status as UnifiedStatus];
    // Use yellow for mismatch status
    if (status === "mismatch") {
      return (
        <Badge className={`bg-yellow-500 hover:bg-yellow-600 text-white ${className || ""}`}>
          {config.label}
        </Badge>
      );
    }
    return (
      <Badge variant={config.variant} className={className}>
        {config.label}
      </Badge>
    );
  }

  // Check if it's a batch status
  if (status in batchStatusConfig) {
    const config = batchStatusConfig[status as BatchStatus];
    if (status === "success") {
      return (
        <Badge
          className={`bg-green-600 hover:bg-green-700 text-white ${className || ""}`}
        >
          {status}
        </Badge>
      );
    }
    return (
      <Badge variant={config.variant} className={className}>
        {status}
      </Badge>
    );
  }

  // Action statuses (job run items)
  const actionColors: Record<string, string> = {
    inserted: "bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 dark:text-blue-400",
    updated: "bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 dark:text-amber-400",
    skipped: "bg-zinc-100 hover:bg-zinc-200 text-zinc-600 dark:bg-zinc-800/50 dark:hover:bg-zinc-800/70 dark:text-zinc-400",
    failed: "bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/30 dark:hover:bg-red-950/50 dark:text-red-400",
  };
  if (status in actionColors) {
    return (
      <Badge className={`${actionColors[status]} ${className || ""}`}>
        {status}
      </Badge>
    );
  }

  // Fallback for unknown statuses
  return (
    <Badge variant="secondary" className={className}>
      {status}
    </Badge>
  );
}

