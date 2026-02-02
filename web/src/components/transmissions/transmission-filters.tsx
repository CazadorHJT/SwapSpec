"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TransmissionFiltersProps {
  make: string;
  bellhousingPattern: string;
  onMakeChange: (v: string) => void;
  onBellhousingPatternChange: (v: string) => void;
}

export function TransmissionFilters({
  make,
  bellhousingPattern,
  onMakeChange,
  onBellhousingPatternChange,
}: TransmissionFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4">
      <div className="space-y-1">
        <Label htmlFor="trans-make">Make</Label>
        <Input
          id="trans-make"
          placeholder="e.g. Tremec"
          className="w-40"
          value={make}
          onChange={(e) => onMakeChange(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="trans-pattern">Bellhousing Pattern</Label>
        <Input
          id="trans-pattern"
          placeholder="e.g. GM LS"
          className="w-40"
          value={bellhousingPattern}
          onChange={(e) => onBellhousingPatternChange(e.target.value)}
        />
      </div>
    </div>
  );
}
