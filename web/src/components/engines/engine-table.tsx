"use client";

import type { Engine } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function EngineTable({
  engines,
  onSelect,
}: {
  engines: Engine[];
  onSelect?: (e: Engine) => void;
}) {
  if (engines.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No engines found.
      </p>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Make</TableHead>
            <TableHead>Model</TableHead>
            <TableHead>Variant</TableHead>
            <TableHead className="text-right">HP</TableHead>
            <TableHead className="text-right">Torque (lb-ft)</TableHead>
            <TableHead className="text-right">Weight (lbs)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {engines.map((e) => (
            <TableRow
              key={e.id}
              className={onSelect ? "cursor-pointer hover:bg-accent" : ""}
              onClick={() => onSelect?.(e)}
            >
              <TableCell>{e.make}</TableCell>
              <TableCell>{e.model}</TableCell>
              <TableCell>{e.variant ?? "—"}</TableCell>
              <TableCell className="text-right">
                {e.power_hp ?? "—"}
              </TableCell>
              <TableCell className="text-right">
                {e.torque_lb_ft ?? "—"}
              </TableCell>
              <TableCell className="text-right">
                {e.weight ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
