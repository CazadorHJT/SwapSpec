"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface VehicleFiltersProps {
  year: string;
  make: string;
  model: string;
  driveType: string;
  bodyStyle: string;
  onYearChange: (v: string) => void;
  onMakeChange: (v: string) => void;
  onModelChange: (v: string) => void;
  onDriveTypeChange: (v: string) => void;
  onBodyStyleChange: (v: string) => void;
}

export function VehicleFilters({
  year,
  make,
  model,
  driveType,
  bodyStyle,
  onYearChange,
  onMakeChange,
  onModelChange,
  onDriveTypeChange,
  onBodyStyleChange,
}: VehicleFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4">
      <div className="space-y-1">
        <Label htmlFor="filter-year">Year</Label>
        <Input
          id="filter-year"
          placeholder="e.g. 2005"
          className="w-28"
          value={year}
          onChange={(e) => onYearChange(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="filter-make">Make</Label>
        <Input
          id="filter-make"
          placeholder="e.g. Ford"
          className="w-36"
          value={make}
          onChange={(e) => onMakeChange(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="filter-model">Model</Label>
        <Input
          id="filter-model"
          placeholder="e.g. Mustang"
          className="w-36"
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="filter-drive">Drive</Label>
        <Input
          id="filter-drive"
          placeholder="e.g. 4x4"
          className="w-28"
          value={driveType}
          onChange={(e) => onDriveTypeChange(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="filter-body">Body</Label>
        <Input
          id="filter-body"
          placeholder="e.g. SUV"
          className="w-28"
          value={bodyStyle}
          onChange={(e) => onBodyStyleChange(e.target.value)}
        />
      </div>
    </div>
  );
}
