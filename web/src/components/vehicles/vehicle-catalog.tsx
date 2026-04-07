"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search, X, Car } from "lucide-react";
import type { Vehicle } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function formatBody(v: Vehicle): string {
  if (!v.body_style) return "";
  const acronym = v.body_style.match(/\(([^)]+)\)/);
  if (acronym) return acronym[1];
  return v.body_style.split("/")[0].trim();
}

function formatEngine(v: Vehicle): string {
  const parts: string[] = [];
  if (v.engine_displacement_l) parts.push(`${v.engine_displacement_l}L`);
  if (v.engine_cylinders) parts.push(`${v.engine_cylinders}-cyl`);
  return parts.join(" ") || "";
}

// ── Single vehicle card row ──────────────────────────────────────
function VehicleCard({
  vehicle,
  onSelect,
}: {
  vehicle: Vehicle;
  onSelect?: (v: Vehicle) => void;
}) {
  const body = formatBody(vehicle);
  const engine = formatEngine(vehicle);
  const hasMesh = Boolean(vehicle.bay_scan_mesh_url);

  return (
    <div
      className={`group rounded-xl border bg-card px-5 py-4 transition-colors ${
        onSelect
          ? "cursor-pointer hover:border-[oklch(0.65_0.18_245)] hover:bg-accent/30"
          : ""
      }`}
      onClick={() => onSelect?.(vehicle)}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Car className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold leading-tight">
              {vehicle.year} {vehicle.make} {vehicle.model}
              {vehicle.trim ? (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {vehicle.trim}
                </span>
              ) : null}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {[engine, vehicle.drive_type, body].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {hasMesh && (
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium"
              style={{
                background: "oklch(0.20 0.04 245)",
                color: "oklch(0.75 0.12 245)",
                border: "1px solid oklch(0.35 0.08 245)",
              }}
            >
              3D Scan
            </span>
          )}
          {vehicle.stock_engine_model && (
            <span className="text-xs text-muted-foreground">
              Stock: {vehicle.stock_engine_model}
            </span>
          )}
          <Badge
            variant={
              vehicle.quality_status === "approved"
                ? "default"
                : vehicle.quality_status === "rejected"
                  ? "destructive"
                  : "secondary"
            }
          >
            {vehicle.quality_status === "approved"
              ? "Verified"
              : vehicle.quality_status === "rejected"
                ? "Rejected"
                : "Pending"}
          </Badge>
        </div>
      </div>
    </div>
  );
}

// ── Section header ───────────────────────────────────────────────
function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-baseline gap-3 pb-2 pt-4">
      <h2 className="text-lg font-bold tracking-tight">{label}</h2>
      <span className="text-sm text-muted-foreground">
        {count} vehicle{count !== 1 ? "s" : ""}
      </span>
    </div>
  );
}

// ── Sub-section header ───────────────────────────────────────────
function ModelHeader({ model, count }: { model: string; count: number }) {
  return (
    <div className="flex items-center gap-2 pb-1 pt-3">
      <span className="text-sm font-semibold text-foreground/80">{model}</span>
      <span className="text-xs text-muted-foreground">({count})</span>
      <div className="flex-1 border-t border-border/50" />
    </div>
  );
}

// ── Main catalog ─────────────────────────────────────────────────
export function VehicleCatalog({
  vehicles,
  loading,
  onSelect,
}: {
  vehicles: Vehicle[];
  loading: boolean;
  onSelect?: (v: Vehicle) => void;
}) {
  const [search, setSearch] = useState("");
  const [make, setMake] = useState("all");
  const [driveType, setDriveType] = useState("all");

  const isFiltered =
    search.trim() !== "" || make !== "all" || driveType !== "all";

  // Derive unique makes and drive types from data
  const makes = useMemo(
    () => [
      "all",
      ...Array.from(
        new Set(vehicles.map((v) => v.make).filter(Boolean)),
      ).sort(),
    ],
    [vehicles],
  );

  const driveTypes = useMemo(
    () => [
      "all",
      ...Array.from(
        new Set(vehicles.map((v) => v.drive_type).filter(Boolean) as string[]),
      ).sort(),
    ],
    [vehicles],
  );

  // Filtered flat list
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vehicles.filter((v) => {
      if (make !== "all" && v.make !== make) return false;
      if (driveType !== "all" && v.drive_type !== driveType) return false;
      if (q) {
        const haystack =
          `${v.year} ${v.make} ${v.model} ${v.trim ?? ""} ${v.drive_type ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [vehicles, search, make, driveType]);

  // Grouped: Make → Model → vehicles[]
  const grouped = useMemo(() => {
    const map = new Map<string, Map<string, Vehicle[]>>();
    for (const v of vehicles) {
      if (!map.has(v.make)) map.set(v.make, new Map());
      const models = map.get(v.make)!;
      if (!models.has(v.model)) models.set(v.model, []);
      models.get(v.model)!.push(v);
    }
    // Sort by make then model
    const sorted = new Map(
      [...map.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([mk, models]) => [
          mk,
          new Map([...models.entries()].sort(([a], [b]) => a.localeCompare(b))),
        ]),
    );
    return sorted;
  }, [vehicles]);

  const clearFilters = () => {
    setSearch("");
    setMake("all");
    setDriveType("all");
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1" style={{ minWidth: 200 }}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search vehicles..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Make dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              {make === "all" ? "All Makes" : make}
              <ChevronDown className="h-4 w-4 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="max-h-72 overflow-y-auto"
          >
            {makes.map((m) => (
              <DropdownMenuItem key={m} onClick={() => setMake(m)}>
                {m === "all" ? "All Makes" : m}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Drive type dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              {driveType === "all" ? "All Drive Types" : driveType}
              <ChevronDown className="h-4 w-4 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {driveTypes.map((d) => (
              <DropdownMenuItem key={d} onClick={() => setDriveType(d)}>
                {d === "all" ? "All Drive Types" : d}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="gap-1 text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Results */}
      {isFiltered ? (
        // Flat filtered list
        <>
          <p className="text-sm text-muted-foreground">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </p>
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No vehicles match your filters.
            </p>
          ) : (
            <div className="space-y-2">
              {filtered.map((v) => (
                <VehicleCard key={v.id} vehicle={v} onSelect={onSelect} />
              ))}
            </div>
          )}
        </>
      ) : (
        // Grouped by make → model
        <>
          {vehicles.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No vehicles found.
            </p>
          ) : (
            Array.from(grouped.entries()).map(([mk, models]) => {
              const makeTotal = Array.from(models.values()).reduce(
                (s, arr) => s + arr.length,
                0,
              );
              return (
                <div key={mk}>
                  <SectionHeader label={mk} count={makeTotal} />
                  {Array.from(models.entries()).map(([mdl, mvehicles]) => (
                    <div key={mdl}>
                      <ModelHeader model={mdl} count={mvehicles.length} />
                      <div className="space-y-2">
                        {mvehicles
                          .sort((a, b) => b.year - a.year)
                          .map((v) => (
                            <VehicleCard
                              key={v.id}
                              vehicle={v}
                              onSelect={onSelect}
                            />
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </>
      )}
    </div>
  );
}
