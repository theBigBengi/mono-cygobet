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

  // Fallback for unknown statuses
  return (
    <Badge variant="secondary" className={className}>
      {status}
    </Badge>
  );
}

