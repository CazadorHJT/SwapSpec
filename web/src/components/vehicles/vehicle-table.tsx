"use client";

import type { Vehicle } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatEngine(v: Vehicle): string {
  if (!v.engine_displacement_l && !v.engine_cylinders) return "—";
  const disp = v.engine_displacement_l ? `${v.engine_displacement_l}L` : "";
  const cyl  = v.engine_cylinders ? `${v.engine_cylinders}-cyl` : "";
  return [disp, cyl].filter(Boolean).join(" ");
}

function formatBody(v: Vehicle): string {
  if (!v.body_style) return "—";
  // Extract parenthetical acronym if present: "Sport Utility Vehicle (SUV)/..." → "SUV"
  const acronym = v.body_style.match(/\(([^)]+)\)/);
  if (acronym) return acronym[1];
  // Otherwise first segment before "/"
  return v.body_style.split("/")[0].trim();
}

export function VehicleTable({
  vehicles,
  onSelect,
}: {
  vehicles: Vehicle[];
  onSelect?: (v: Vehicle) => void;
}) {
  if (vehicles.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No vehicles found.
      </p>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Year</TableHead>
            <TableHead>Make</TableHead>
            <TableHead>Model</TableHead>
            <TableHead>Engine</TableHead>
            <TableHead>Drive</TableHead>
            <TableHead>Trim</TableHead>
            <TableHead>Body</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vehicles.map((v) => (
            <TableRow
              key={v.id}
              className={onSelect ? "cursor-pointer hover:bg-accent" : ""}
              onClick={() => onSelect?.(v)}
            >
              <TableCell>{v.year}</TableCell>
              <TableCell>{v.make}</TableCell>
              <TableCell>{v.model}</TableCell>
              <TableCell>{formatEngine(v)}</TableCell>
              <TableCell>{v.drive_type ?? "—"}</TableCell>
              <TableCell>{v.trim ?? "—"}</TableCell>
              <TableCell>{formatBody(v)}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    v.quality_status === "approved"
                      ? "default"
                      : v.quality_status === "rejected"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {v.quality_status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
