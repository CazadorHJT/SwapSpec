"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import type { Transmission } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ── Gear ratio formatter ────────────────────────────────────────
function formatRatios(
  ratios: Record<string, number> | undefined,
  gearCount: number | undefined,
): string {
  if (!ratios) return "—";
  const keys = Object.keys(ratios)
    .filter((k) => !isNaN(Number(k)))
    .sort((a, b) => Number(a) - Number(b));
  if (keys.length === 0) return "—";
  const first = ratios[keys[0]]?.toFixed(2);
  const last = ratios[keys[keys.length - 1]]?.toFixed(2);
  const count = gearCount ?? keys.length;
  return `${count}-spd  ${first} – ${last}`;
}

// ── Single transmission card row ────────────────────────────────
function TransmissionCard({
  transmission: t,
  onSelect,
}: {
  transmission: Transmission;
  onSelect?: (t: Transmission) => void;
}) {
  const name = `${t.make} · ${t.model}`;
  const ratioStr = formatRatios(t.gear_ratios, t.gear_count);
  const donor =
    t.origin_year && t.origin_make && t.origin_model
      ? `${t.origin_year} ${t.origin_make} ${t.origin_model}`
      : null;

  return (
    <div
      className={`group rounded-xl border bg-card px-5 py-4 transition-colors ${
        onSelect
          ? "cursor-pointer hover:border-primary/40"
          : "hover:border-primary/20"
      }`}
      onClick={() => onSelect?.(t)}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* Left: identity */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold">{name}</span>
            {t.trans_type && (
              <span
                className="shrink-0 rounded px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide text-white"
                style={{ background: "oklch(0.65 0.18 245)" }}
              >
                {t.trans_type}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
            {t.bellhousing_pattern && (
              <span>Pattern: {t.bellhousing_pattern}</span>
            )}
            {ratioStr !== "—" && <span>Ratios: {ratioStr}</span>}
            {donor && <span className="text-xs">Stock: {donor}</span>}
          </div>
        </div>

        {/* Right: torque capacity */}
        <div className="text-right">
          {t.max_torque_capacity_lb_ft ? (
            <span className="text-sm font-semibold tabular-nums">
              {t.max_torque_capacity_lb_ft}{" "}
              <span className="font-normal text-muted-foreground">
                lb-ft max
              </span>
            </span>
          ) : t.weight ? (
            <span className="text-sm text-muted-foreground">
              {t.weight} lbs
            </span>
          ) : null}
          {t.drivetrain_type && (
            <p className="text-xs text-muted-foreground">{t.drivetrain_type}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Section header ──────────────────────────────────────────────
function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-3 pb-1 pt-6">
      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs tabular-nums text-muted-foreground">
        {count}
      </span>
    </div>
  );
}

// ── Dropdown filter button ──────────────────────────────────────
function FilterDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const active = value !== "all";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`gap-1.5 ${active ? "border-primary text-primary" : ""}`}
        >
          {active ? value : label}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[160px]">
        <DropdownMenuItem
          onClick={() => onChange("all")}
          className={value === "all" ? "font-semibold text-primary" : ""}
        >
          All
        </DropdownMenuItem>
        {options.map((opt) => (
          <DropdownMenuItem
            key={opt}
            onClick={() => onChange(opt)}
            className={value === opt ? "font-semibold text-primary" : ""}
          >
            {opt}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Main catalog ────────────────────────────────────────────────
export function TransmissionCatalog({
  transmissions,
  loading,
  onSelect,
}: {
  transmissions: Transmission[];
  loading: boolean;
  onSelect?: (t: Transmission) => void;
}) {
  const [search, setSearch] = useState("");
  const [manufacturer, setManufacturer] = useState("all");
  const [type, setType] = useState("all");

  const manufacturers = useMemo(
    () => [...new Set(transmissions.map((t) => t.make))].sort(),
    [transmissions],
  );

  const types = useMemo(
    () =>
      [
        ...new Set(transmissions.map((t) => t.trans_type).filter(Boolean)),
      ].sort() as string[],
    [transmissions],
  );

  const isFiltered =
    search.trim() !== "" || manufacturer !== "all" || type !== "all";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transmissions.filter((t) => {
      if (manufacturer !== "all" && t.make !== manufacturer) return false;
      if (type !== "all" && t.trans_type !== type) return false;
      if (q) {
        const haystack = [t.make, t.model, t.bellhousing_pattern, t.trans_type]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [transmissions, search, manufacturer, type]);

  // Grouped: make → bellhousing_pattern → transmissions
  const grouped = useMemo(() => {
    const result: Map<string, Map<string, Transmission[]>> = new Map();
    for (const t of transmissions) {
      const mfr = t.make;
      const pattern = t.bellhousing_pattern ?? "Unknown Pattern";
      if (!result.has(mfr)) result.set(mfr, new Map());
      const mfrMap = result.get(mfr)!;
      if (!mfrMap.has(pattern)) mfrMap.set(pattern, []);
      mfrMap.get(pattern)!.push(t);
    }
    return result;
  }, [transmissions]);

  const clearFilters = () => {
    setSearch("");
    setManufacturer("all");
    setType("all");
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
      {/* Search + filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search make, model, pattern..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FilterDropdown
          label="Manufacturer"
          value={manufacturer}
          options={manufacturers}
          onChange={setManufacturer}
        />
        <FilterDropdown
          label="Type"
          value={type}
          options={types}
          onChange={setType}
        />
        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={clearFilters}
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Result count */}
      <p className="text-sm text-muted-foreground">
        {isFiltered
          ? `${filtered.length} result${filtered.length !== 1 ? "s" : ""}`
          : `${transmissions.length} transmission${transmissions.length !== 1 ? "s" : ""}`}
      </p>

      {/* Flat filtered list */}
      {isFiltered ? (
        filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No transmissions match your filters.
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map((t) => (
              <TransmissionCard
                key={t.id}
                transmission={t}
                onSelect={onSelect}
              />
            ))}
          </div>
        )
      ) : (
        /* Grouped view */
        Array.from(grouped.entries()).map(([mfr, patternMap]) => (
          <div key={mfr}>
            <SectionHeader
              label={mfr}
              count={Array.from(patternMap.values()).flat().length}
            />
            {Array.from(patternMap.entries()).map(([pattern, list]) => (
              <div key={pattern}>
                <div className="flex items-center gap-2 py-2 pl-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {pattern}
                  </span>
                  <div className="h-px flex-1 bg-border/50" />
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {list.length}
                  </span>
                </div>
                <div className="space-y-2 pl-2">
                  {list.map((t) => (
                    <TransmissionCard
                      key={t.id}
                      transmission={t}
                      onSelect={onSelect}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
