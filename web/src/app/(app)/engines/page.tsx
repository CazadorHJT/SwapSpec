"use client";

import { useEngines } from "@/hooks/use-engines";
import { EngineCatalog } from "@/components/engines/engine-catalog";

export default function EnginesPage() {
  const { data, loading } = useEngines();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Engines</h1>
      <EngineCatalog engines={data?.engines ?? []} loading={loading} />
    </div>
  );
}
