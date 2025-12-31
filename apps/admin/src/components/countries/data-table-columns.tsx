import type { ColumnDef } from "@tanstack/react-table";
import { Eye, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { UnifiedCountry } from "@/types/countries";

export const createColumns = (
  onSync?: (externalId: string) => void,
  isSyncing?: boolean
): ColumnDef<UnifiedCountry>[] => [
  {
    accessorKey: "name",
    header: "Country",
    cell: ({ row }) => {
      const country = row.original;
      return (
        <div className="flex items-center gap-2">
          {country.imagePath && (
            <img
              src={country.imagePath}
              alt={country.name}
              width={20}
              height={14}
              className="rounded border object-cover"
            />
          )}
          <span className="font-medium">{country.name}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "externalId",
    header: "externalId",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.getValue("externalId")}</span>
    ),
  },
  {
    accessorKey: "iso",
    header: "ISO",
    cell: ({ row }) => {
      const country = row.original;
      const hasBothISO = country.iso2 && country.iso3;
      return hasBothISO ? (
        <div className="flex gap-1">
          <Badge variant="secondary" className="font-mono text-xs">
            {country.iso2}
          </Badge>
          <Badge variant="secondary" className="font-mono text-xs">
            {country.iso3}
          </Badge>
        </div>
      ) : (
        <Badge variant="destructive" className="text-xs">
          Missing
        </Badge>
      );
    },
  },
  {
    accessorKey: "leaguesCount",
    header: "Leagues",
    cell: ({ row }) => {
      const country = row.original;
      if (country.source === "provider") {
        return <span className="text-muted-foreground">—</span>;
      }
      return (
        <Badge
          variant={country.leaguesCount ? "default" : "secondary"}
          className={
            !country.leaguesCount
              ? "bg-yellow-500/10 text-yellow-700 border-yellow-500/20"
              : ""
          }
        >
          {country.leaguesCount || 0}
        </Badge>
      );
    },
  },
  {
    accessorKey: "source",
    header: "Source",
    cell: ({ row }) => {
      const source = row.getValue("source") as UnifiedCountry["source"];
      return (
        <Badge
          variant={
            source === "db"
              ? "default"
              : source === "provider"
                ? "secondary"
                : "outline"
          }
        >
          {source === "db" ? "DB" : source === "provider" ? "Provider" : "Both"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as UnifiedCountry["status"];
      const statusLabels: Record<UnifiedCountry["status"], string> = {
        ok: "OK",
        "missing-in-db": "Missing",
        "extra-in-db": "Extra",
        mismatch: "Mismatch",
        "no-leagues": "No Leagues",
        "iso-missing": "ISO Missing",
        new: "New",
      };
      return (
        <Badge
          variant={
            status === "ok"
              ? "default"
              : status === "missing-in-db"
                ? "secondary"
                : "destructive"
          }
          className="text-xs"
        >
          {statusLabels[status]}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const country = row.original;
      return (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => console.log("View", country.externalId)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {country.status === "missing-in-db" && onSync && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSync(country.externalId)}
              disabled={isSyncing}
              title="Sync from provider"
            >
              <RefreshCw
                className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
              />
            </Button>
          )}
        </div>
      );
    },
  },
];
