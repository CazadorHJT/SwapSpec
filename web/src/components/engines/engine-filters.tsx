"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface EngineFiltersProps {
  make: string;
  hpRange: [number, number];
  onMakeChange: (v: string) => void;
  onHpRangeChange: (v: [number, number]) => void;
}

export function EngineFilters({
  make,
  hpRange,
  onMakeChange,
  onHpRangeChange,
}: EngineFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-6">
      <div className="space-y-1">
        <Label htmlFor="engine-make">Make</Label>
        <Input
          id="engine-make"
          placeholder="e.g. Chevrolet"
          className="w-40"
          value={make}
          onChange={(e) => onMakeChange(e.target.value)}
        />
      </div>
      <div className="space-y-1 min-w-[200px]">
        <Label>
          Horsepower: {hpRange[0]} – {hpRange[1]}
        </Label>
        <Slider
          min={0}
          max={2000}
          step={10}
          value={hpRange}
          onValueChange={(v) => onHpRangeChange(v as [number, number])}
        />
      </div>
    </div>
  );
}
