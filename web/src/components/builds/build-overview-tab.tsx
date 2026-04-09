"use client";

import { Download, Car, Cog, ArrowLeftRight, Lightbulb } from "lucide-react";
import type { BuildExport, DataSourceType } from "@/lib/types";
import * as api from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useState } from "react";

const SOURCE_COLORS: Record<DataSourceType, { bg: string; text: string }> = {
  manufacturer: {
    bg: "oklch(0.70 0.15 145 / 15%)",
    text: "oklch(0.65 0.15 145)",
  },
  carquery_api: {
    bg: "oklch(0.65 0.18 245 / 15%)",
    text: "oklch(0.65 0.18 245)",
  },
  nhtsa_api: { bg: "oklch(0.65 0.18 245 / 15%)", text: "oklch(0.65 0.18 245)" },
  user_contributed: {
    bg: "oklch(0.70 0.14 55 / 15%)",
    text: "oklch(0.70 0.14 55)",
  },
};

const SOURCE_LABELS: Record<DataSourceType, string> = {
  manufacturer: "MFR",
  carquery_api: "API",
  nhtsa_api: "API",
  user_contributed: "USER",
};

function SourceBadge({ source }: { source?: DataSourceType }) {
  if (!source) return null;
  const colors = SOURCE_COLORS[source];
  return (
    <span
      className="ml-1.5 inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
      style={{ background: colors.bg, color: colors.text }}
    >
      {SOURCE_LABELS[source]}
    </span>
  );
}

function SpecRow({
  label,
  value,
  unit,
  source,
}: {
  label: string;
  value?: string | number | null;
  unit?: string;
  source?: DataSourceType;
}) {
  if (value == null) return null;
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium tabular-nums">
        {value}
        {unit ? ` ${unit}` : ""}
        <SourceBadge source={source} />
      </span>
    </div>
  );
}

function SpecPanel({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{
    className?: string;
    style?: React.CSSProperties;
  }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border">
      {/* Panel header */}
      <div className="flex items-center gap-2.5 px-4 py-3 bg-sidebar border-b">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: "oklch(0.65 0.18 245 / 12%)" }}
        >
          <Icon className="h-4 w-4" style={{ color: "oklch(0.65 0.18 245)" }} />
        </div>
        <span className="text-sm font-semibold">{title}</span>
      </div>
      {/* Panel body */}
      <div className="divide-y divide-border/50 px-4">{children}</div>
    </div>
  );
}

export function BuildOverviewTab({ data }: { data: BuildExport }) {
  const { vehicle, engine, transmission, recommendations } = data;
  const [downloading, setDownloading] = useState(false);

  const engineSources = (engine as Record<string, unknown>)?.data_sources as
    | Record<string, DataSourceType>
    | undefined;
  const vehicleSources = (vehicle as Record<string, unknown>)?.data_sources as
    | Record<string, DataSourceType>
    | undefined;
  const transSources = (transmission as Record<string, unknown>)
    ?.data_sources as Record<string, DataSourceType> | undefined;

  async function handleExportPdf() {
    setDownloading(true);
    try {
      const blob = await api.downloadBuildPdf(data.build.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const v = vehicle as Record<string, unknown>;
      a.download = `swapspec_${v.year}_${v.make}_${v.model}_report.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "PDF export failed");
    } finally {
      setDownloading(false);
    }
  }

  const v = vehicle as Record<string, unknown>;
  const e = engine as Record<string, unknown>;
  const t = transmission as Record<string, unknown> | null;

  return (
    <div className="space-y-6">
      {/* Spec panels */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Vehicle */}
        <SpecPanel icon={Car} title="Vehicle">
          <SpecRow label="Year" value={v.year as number} />
          <SpecRow label="Make" value={v.make as string} />
          <SpecRow label="Model" value={v.model as string} />
          {typeof v.trim === "string" && (
            <SpecRow label="Trim" value={v.trim} />
          )}
          <SpecRow
            label="Curb Weight"
            value={v.curb_weight_lbs as number}
            unit="lbs"
            source={vehicleSources?.curb_weight_lbs}
          />
          <SpecRow
            label="Bay (L×W×H)"
            value={
              v.engine_bay_length_in
                ? `${v.engine_bay_length_in}×${v.engine_bay_width_in}×${v.engine_bay_height_in}`
                : undefined
            }
            unit="in"
            source={vehicleSources?.engine_bay_length_in}
          />
          <SpecRow
            label="Ground Clearance"
            value={v.stock_ground_clearance_in as number}
            unit="in"
            source={vehicleSources?.stock_ground_clearance_in}
          />
          <SpecRow
            label="Steering"
            value={v.steering_type as string}
            source={vehicleSources?.steering_type}
          />
        </SpecPanel>

        {/* Engine */}
        <SpecPanel icon={Cog} title="Engine">
          <SpecRow label="Make" value={e.make as string} />
          <SpecRow label="Model" value={e.model as string} />
          {typeof e.variant === "string" && (
            <SpecRow label="Variant" value={e.variant} />
          )}
          <SpecRow
            label="Power"
            value={e.power_hp as number}
            unit="hp"
            source={engineSources?.power_hp}
          />
          <SpecRow
            label="Torque"
            value={e.torque_lb_ft as number}
            unit="lb-ft"
            source={engineSources?.torque_lb_ft}
          />
          <SpecRow
            label="Displacement"
            value={e.displacement_liters as number}
            unit="L"
            source={engineSources?.displacement_liters}
          />
          <SpecRow
            label="Compression"
            value={e.compression_ratio as number}
            unit=":1"
            source={engineSources?.compression_ratio}
          />
          <SpecRow
            label="Valve Train"
            value={e.valve_train as string}
            source={engineSources?.valve_train}
          />
          <SpecRow
            label="Bore / Stroke"
            value={e.bore_mm ? `${e.bore_mm} / ${e.stroke_mm}` : undefined}
            unit="mm"
            source={engineSources?.bore_mm}
          />
          <SpecRow
            label="Redline"
            value={e.redline_rpm as number}
            unit="RPM"
            source={engineSources?.redline_rpm}
          />
          <SpecRow
            label="CAN Bus"
            value={e.can_bus_protocol as string}
            source={engineSources?.can_bus_protocol}
          />
          <SpecRow
            label="Oil Pan"
            value={
              e.oil_pan_depth_in
                ? `${e.oil_pan_depth_in}" ${e.oil_pan_type ?? ""}`
                : undefined
            }
            source={engineSources?.oil_pan_depth_in}
          />
        </SpecPanel>

        {/* Transmission */}
        <SpecPanel icon={ArrowLeftRight} title="Transmission">
          {t ? (
            <>
              <SpecRow label="Make" value={t.make as string} />
              <SpecRow label="Model" value={t.model as string} />
              <SpecRow
                label="Type"
                value={t.trans_type as string}
                source={transSources?.trans_type}
              />
              {typeof t.drivetrain_type === "string" && (
                <SpecRow
                  label="Drivetrain"
                  value={
                    t.drivetrain_type === "4WD"
                      ? "4WD (transfer case)"
                      : (t.drivetrain_type as string)
                  }
                />
              )}
              <SpecRow
                label="Gears"
                value={t.gear_count as number}
                source={transSources?.gear_count}
              />
              {typeof t.bellhousing_pattern === "string" && (
                <SpecRow label="Bellhousing" value={t.bellhousing_pattern} />
              )}
              <SpecRow
                label="Max Torque"
                value={t.max_torque_capacity_lb_ft as number}
                unit="lb-ft"
                source={transSources?.max_torque_capacity_lb_ft}
              />
              <SpecRow
                label="Input Spline"
                value={t.input_shaft_spline as string}
                source={transSources?.input_shaft_spline}
              />
              {t.gear_ratios != null && typeof t.gear_ratios === "object" && (
                <SpecRow
                  label="Ratios"
                  value={Object.entries(t.gear_ratios as Record<string, number>)
                    .map(([k, rv]) => `${k}: ${rv}`)
                    .join(", ")}
                  source={transSources?.gear_ratios}
                />
              )}
            </>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No transmission selected
            </p>
          )}
        </SpecPanel>
      </div>

      {/* Source legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {(
          [
            {
              label: "MFR — Manufacturer / OEM",
              color: "oklch(0.65 0.15 145)",
            },
            { label: "API — External API", color: "oklch(0.65 0.18 245)" },
            { label: "USER — User Contributed", color: "oklch(0.70 0.14 55)" },
          ] as const
        ).map(({ label, color }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: color }}
            />
            {label}
          </span>
        ))}
      </div>

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <>
          <Separator />
          <div className="overflow-hidden rounded-xl border">
            <div className="flex items-center gap-2.5 px-4 py-3 bg-sidebar border-b">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-lg"
                style={{ background: "oklch(0.70 0.14 55 / 15%)" }}
              >
                <Lightbulb
                  className="h-4 w-4"
                  style={{ color: "oklch(0.70 0.14 55)" }}
                />
              </div>
              <span className="text-sm font-semibold">Recommendations</span>
            </div>
            <ul className="divide-y divide-border/50">
              {recommendations.map((rec, i) => (
                <li key={i} className="px-4 py-3 text-sm leading-relaxed">
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      <Separator />

      <Button
        onClick={handleExportPdf}
        disabled={downloading}
        style={{ background: "oklch(0.65 0.18 245)", color: "#fff" }}
      >
        <Download className="mr-2 h-4 w-4" />
        {downloading ? "Exporting..." : "Export PDF Report"}
      </Button>
    </div>
  );
}
