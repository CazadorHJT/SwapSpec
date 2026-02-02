"use client";

import { useState } from "react";
import { useTransmissions } from "@/hooks/use-transmissions";
import { TransmissionFilters } from "@/components/transmissions/transmission-filters";
import { TransmissionTable } from "@/components/transmissions/transmission-table";
import { Skeleton } from "@/components/ui/skeleton";

export default function TransmissionsPage() {
  const [make, setMake] = useState("");
  const [bellhousingPattern, setBellhousingPattern] = useState("");

  const { data, loading } = useTransmissions({
    make: make || undefined,
    bellhousing_pattern: bellhousingPattern || undefined,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Transmissions</h1>

      <TransmissionFilters
        make={make}
        bellhousingPattern={bellhousingPattern}
        onMakeChange={setMake}
        onBellhousingPatternChange={setBellhousingPattern}
      />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <>
          <TransmissionTable transmissions={data?.transmissions ?? []} />
          {data && (
            <p className="text-sm text-muted-foreground">
              {data.total} transmission{data.total !== 1 ? "s" : ""} found
            </p>
          )}
        </>
      )}
    </div>
  );
}
