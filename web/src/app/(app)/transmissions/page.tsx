"use client";

import { useTransmissions } from "@/hooks/use-transmissions";
import { TransmissionCatalog } from "@/components/transmissions/transmission-catalog";

export default function TransmissionsPage() {
  const { data, loading } = useTransmissions({ limit: 500 });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Transmissions</h1>
      <TransmissionCatalog
        transmissions={data?.transmissions ?? []}
        loading={loading}
      />
    </div>
  );
}
