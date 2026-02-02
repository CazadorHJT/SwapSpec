"use client";

import { useState } from "react";
import { useVehicles } from "@/hooks/use-vehicles";
import { VehicleFilters } from "@/components/vehicles/vehicle-filters";
import { VehicleTable } from "@/components/vehicles/vehicle-table";
import { VinDecoder } from "@/components/vehicles/vin-decoder";
import { Skeleton } from "@/components/ui/skeleton";

export default function VehiclesPage() {
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");

  const { data, loading } = useVehicles({
    year: year ? parseInt(year) : undefined,
    make: make || undefined,
    model: model || undefined,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Vehicles</h1>

      <VinDecoder />

      <VehicleFilters
        year={year}
        make={make}
        model={model}
        onYearChange={setYear}
        onMakeChange={setMake}
        onModelChange={setModel}
      />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <>
          <VehicleTable vehicles={data?.vehicles ?? []} />
          {data && (
            <p className="text-sm text-muted-foreground">
              {data.total} vehicle{data.total !== 1 ? "s" : ""} found
            </p>
          )}
        </>
      )}
    </div>
  );
}
