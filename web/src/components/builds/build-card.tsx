"use client";

import Link from "next/link";
import { ArrowRight, Calendar, Cog, GitFork } from "lucide-react";
import type { Build } from "@/lib/types";
import { useApi } from "@/hooks/use-api";
import * as api from "@/lib/api-client";

const STATUS_COLORS: Record<
  string,
  { bar: string; badge: string; text: string }
> = {
  complete: {
    bar: "oklch(0.65 0.18 245)",
    badge: "oklch(0.20 0.04 245)",
    text: "oklch(0.75 0.12 245)",
  },
  draft: {
    bar: "oklch(0.70 0.14 55)",
    badge: "oklch(0.20 0.04 55)",
    text: "oklch(0.75 0.12 55)",
  },
};

function getStatus(status: string) {
  return STATUS_COLORS[status] ?? STATUS_COLORS.planning;
}

export function BuildCard({ build }: { build: Build }) {
  const date = new Date(build.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const { data: vehicle } = useApi(
    () => api.getVehicle(build.vehicle_id),
    [build.vehicle_id],
  );
  const { data: engine } = useApi(
    () => api.getEngine(build.engine_id),
    [build.engine_id],
  );
  const { data: transmission } = useApi(
    () =>
      build.transmission_id
        ? api.getTransmission(build.transmission_id)
        : Promise.resolve(null),
    [build.transmission_id],
  );

  const vehicleLabel = vehicle
    ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
    : "Loading…";

  const engineLabel = engine
    ? [engine.make, engine.model, engine.variant].filter(Boolean).join(" ")
    : null;

  const transLabel = transmission
    ? [transmission.make, transmission.model].filter(Boolean).join(" ")
    : null;

  const colors = getStatus(build.status);

  return (
    <Link href={`/builds/${build.id}`} className="group block">
      <div className="relative overflow-hidden rounded-xl border bg-card transition-all duration-200 hover:border-[oklch(0.45_0.12_245)] hover:shadow-lg hover:shadow-[oklch(0.65_0.18_245)]/5">
        {/* Status accent bar */}
        <div
          className="absolute left-0 top-0 h-full w-1 rounded-l-xl"
          style={{ background: colors.bar }}
        />

        <div className="p-5 pl-6">
          {/* Header row */}
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold leading-tight">
                {vehicleLabel}
              </h3>
              {vehicle?.trim && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {vehicle.trim}
                </p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-medium capitalize"
                style={{
                  background: colors.badge,
                  color: colors.text,
                  border: `1px solid ${colors.bar}40`,
                }}
              >
                {build.status.replace("_", " ")}
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          </div>

          {/* Swap summary */}
          <div className="space-y-1.5">
            {engineLabel ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Cog className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{engineLabel}</span>
                {engine?.power_hp && (
                  <span
                    className="ml-auto shrink-0 text-xs font-medium tabular-nums"
                    style={{ color: colors.bar }}
                  >
                    {engine.power_hp} hp
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground/40">
                <Cog className="h-3.5 w-3.5 shrink-0" />
                <span>Engine loading…</span>
              </div>
            )}

            {transLabel ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <GitFork className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{transLabel}</span>
              </div>
            ) : build.transmission_id ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground/40">
                <GitFork className="h-3.5 w-3.5 shrink-0" />
                <span>Transmission loading…</span>
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground/60">
            <Calendar className="h-3 w-3" />
            <span>{date}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
