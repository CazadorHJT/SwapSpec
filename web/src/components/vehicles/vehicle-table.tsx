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
            <TableHead>Trim</TableHead>
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
              <TableCell>{v.trim ?? "—"}</TableCell>
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
