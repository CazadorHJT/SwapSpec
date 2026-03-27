"use client";

import type { Transmission } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function TransmissionTable({
  transmissions,
  onSelect,
}: {
  transmissions: Transmission[];
  onSelect?: (t: Transmission) => void;
}) {
  if (transmissions.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No transmissions found.
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
            <TableHead>Type</TableHead>
            <TableHead>Drivetrain</TableHead>
            <TableHead>Speeds</TableHead>
            <TableHead>Bellhousing</TableHead>
            <TableHead className="text-right">Weight (lbs)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transmissions.map((t) => (
            <TableRow
              key={t.id}
              className={onSelect ? "cursor-pointer hover:bg-accent" : ""}
              onClick={() => onSelect?.(t)}
            >
              <TableCell>{t.make}</TableCell>
              <TableCell>{t.model}</TableCell>
              <TableCell>
                {t.trans_type ? (
                  <Badge variant="outline">{t.trans_type}</Badge>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell>
                {t.drivetrain_type ? (
                  <Badge variant="secondary">
                    {t.drivetrain_type === "4WD"
                      ? "4WD (transfer case)"
                      : t.drivetrain_type}
                  </Badge>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell>{t.gear_count ?? "—"}</TableCell>
              <TableCell>
                {t.bellhousing_pattern ? (
                  <Badge variant="outline">{t.bellhousing_pattern}</Badge>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="text-right">{t.weight ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
