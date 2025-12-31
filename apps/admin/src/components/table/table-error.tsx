interface TableErrorProps {
  error: Error | string | null;
}

export function TableError({ error }: TableErrorProps) {
  if (!error) return null;

  return (
    <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-4">
      <p className="text-destructive font-medium">Error loading data</p>
      <p className="text-sm text-muted-foreground mt-1">{String(error)}</p>
    </div>
  );
}
