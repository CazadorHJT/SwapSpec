"use client";

import { useTransmissions } from "@/hooks/use-transmissions";
import { TransmissionCatalog } from "@/components/transmissions/transmission-catalog";

export default function TransmissionsPage() {
  const { data, loading } = useTransmissions();

  return (
    <div className="space-y-6">
      <TransmissionCatalog
        transmissions={data?.transmissions ?? []}
        loading={loading}
      />
    </div>
  );
}
