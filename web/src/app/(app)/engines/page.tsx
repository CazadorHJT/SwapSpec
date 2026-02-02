"use client";

import { useState } from "react";
import { useEngines } from "@/hooks/use-engines";
import { EngineFilters } from "@/components/engines/engine-filters";
import { EngineTable } from "@/components/engines/engine-table";
import { Skeleton } from "@/components/ui/skeleton";

export default function EnginesPage() {
  const [make, setMake] = useState("");
  const [hpRange, setHpRange] = useState<[number, number]>([0, 2000]);

  const { data, loading } = useEngines({
    make: make || undefined,
    min_hp: hpRange[0] > 0 ? hpRange[0] : undefined,
    max_hp: hpRange[1] < 2000 ? hpRange[1] : undefined,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Engines</h1>

      <EngineFilters
        make={make}
        hpRange={hpRange}
        onMakeChange={setMake}
        onHpRangeChange={setHpRange}
      />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <>
          <EngineTable engines={data?.engines ?? []} />
          {data && (
            <p className="text-sm text-muted-foreground">
              {data.total} engine{data.total !== 1 ? "s" : ""} found
            </p>
          )}
        </>
      )}
    </div>
  );
}
