"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import type { Engine } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ── HP bar ─────────────────────────────────────────────────────
function HpBar({ hp, maxHp }: { hp: number; maxHp: number }) {
  const pct = maxHp > 0 ? Math.round((hp / maxHp) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 text-right text-sm font-semibold tabular-nums">
        {hp} hp
      </span>
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: "oklch(0.65 0.18 245)",
          }}
        />
      </div>
    </div>
  );
}

// ── Single engine card row ──────────────────────────────────────
function EngineCard({
  engine,
  maxHp,
  onSelect,
}: {
  engine: Engine;
  maxHp: number;
  onSelect?: (e: Engine) => void;
}) {
  const name = [engine.make, engine.model, engine.variant]
    .filter(Boolean)
    .join(" · ");
  const displacement = engine.displacement_liters
    ? `${engine.displacement_liters}L`
    : null;
  const donor =
    engine.origin_year && engine.origin_make && engine.origin_model
      ? `${engine.origin_year} ${engine.origin_make} ${engine.origin_model}`
      : null;

  return (
    <div
      className={`group rounded-xl border bg-card px-5 py-4 transition-colors ${
        onSelect
          ? "cursor-pointer hover:border-primary/40"
          : "hover:border-primary/20"
      }`}
      style={
        { "--hover-glow": "oklch(0.65 0.18 245 / 0.04)" } as React.CSSProperties
      }
      onClick={() => onSelect?.(engine)}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* Left: identity */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {engine.engine_family && (
              <span
                className="shrink-0 rounded px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide text-white"
                style={{ background: "oklch(0.65 0.18 245)" }}
              >
                {engine.engine_family}
              </span>
            )}
            <span className="truncate font-semibold">{name}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
            {displacement && <span>{displacement}</span>}
            {engine.torque_lb_ft && <span>{engine.torque_lb_ft} lb-ft</span>}
            {engine.weight && <span>{engine.weight} lbs</span>}
            {donor && <span className="text-xs">Stock: {donor}</span>}
          </div>
        </div>

        {/* Right: HP bar */}
        {engine.power_hp ? (
          <HpBar hp={engine.power_hp} maxHp={maxHp} />
        ) : (
          <span className="text-sm text-muted-foreground">HP unknown</span>
        )}
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
export function EngineCatalog({
  engines,
  loading,
  onSelect,
}: {
  engines: Engine[];
  loading: boolean;
  onSelect?: (e: Engine) => void;
}) {
  const [search, setSearch] = useState("");
  const [manufacturer, setManufacturer] = useState("all");

  // Derive dropdown options from data
  const manufacturers = useMemo(
    () => [...new Set(engines.map((e) => e.make))].sort(),
    [engines],
  );

  const maxHp = useMemo(
    () => Math.max(0, ...engines.map((e) => e.power_hp ?? 0)),
    [engines],
  );

  const isFiltered = search.trim() !== "" || manufacturer !== "all";

  // Filtered flat list
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return engines.filter((e) => {
      if (manufacturer !== "all" && e.make !== manufacturer) return false;
      if (q) {
        const haystack = [e.make, e.model, e.variant, e.engine_family]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [engines, search, manufacturer]);

  // Grouped: make → family → engines
  const grouped = useMemo(() => {
    const result: Map<string, Map<string, Engine[]>> = new Map();
    for (const e of engines) {
      const mfr = e.make;
      const family = e.engine_family ?? "Other";
      if (!result.has(mfr)) result.set(mfr, new Map());
      const mfrMap = result.get(mfr)!;
      if (!mfrMap.has(family)) mfrMap.set(family, []);
      mfrMap.get(family)!.push(e);
    }
    return result;
  }, [engines]);

  const clearFilters = () => {
    setSearch("");
    setManufacturer("all");
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
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search make, model, family..."
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
          : `${engines.length} engine${engines.length !== 1 ? "s" : ""}`}
      </p>

      {/* Flat filtered list */}
      {isFiltered ? (
        filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No engines match your filters.
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map((e) => (
              <EngineCard
                key={e.id}
                engine={e}
                maxHp={maxHp}
                onSelect={onSelect}
              />
            ))}
          </div>
        )
      ) : (
        /* Grouped view */
        Array.from(grouped.entries()).map(([mfr, familyMap]) => (
          <div key={mfr}>
            <SectionHeader
              label={mfr}
              count={Array.from(familyMap.values()).flat().length}
            />
            {Array.from(familyMap.entries()).map(([family, list]) => (
              <div key={family}>
                <div className="flex items-center gap-2 py-2 pl-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {family}
                  </span>
                  <div className="h-px flex-1 bg-border/50" />
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {list.length}
                  </span>
                </div>
                <div className="space-y-2 pl-2">
                  {list.map((e) => (
                    <EngineCard
                      key={e.id}
                      engine={e}
                      maxHp={maxHp}
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
