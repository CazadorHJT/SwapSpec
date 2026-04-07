"use client";

import { useVehicles } from "@/hooks/use-vehicles";
import { VehicleCatalog } from "@/components/vehicles/vehicle-catalog";
import { VinDecoder } from "@/components/vehicles/vin-decoder";

export default function VehiclesPage() {
  const { data, loading, refetch } = useVehicles();

  return (
    <div className="space-y-6">
      <VinDecoder
        onVehicleCreated={() => refetch()}
        existingVehicles={data?.vehicles}
      />

      <VehicleCatalog vehicles={data?.vehicles ?? []} loading={loading} />
    </div>
  );
}
