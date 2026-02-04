"use client";

import { Download } from "lucide-react";
import type { BuildExport, DataSourceType } from "@/lib/types";
import * as api from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useState } from "react";

const SOURCE_COLORS: Record<DataSourceType, string> = {
  manufacturer: "bg-green-500/20 text-green-400 border-green-500/30",
  carquery_api: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  nhtsa_api: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  user_contributed: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

const SOURCE_LABELS: Record<DataSourceType, string> = {
  manufacturer: "MFR",
  carquery_api: "API",
  nhtsa_api: "API",
  user_contributed: "USER",
};

function SourceBadge({ source }: { source?: DataSourceType }) {
  if (!source) return null;
  return (
    <span
      className={`ml-1.5 inline-flex items-center rounded border px-1 py-0.5 text-[10px] font-medium leading-none ${SOURCE_COLORS[source] ?? "bg-muted text-muted-foreground border-border"}`}
    >
      {SOURCE_LABELS[source] ?? "?"}
    </span>
  );
}

function SpecLine({
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
    <p>
      <span className="font-medium">{label}:</span> {value}
      {unit ? ` ${unit}` : ""}
      <SourceBadge source={source} />
    </p>
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
  const transSources = (transmission as Record<string, unknown>)?.data_sources as
    | Record<string, DataSourceType>
    | undefined;

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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Vehicle card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vehicle</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p>
              <span className="font-medium">Year:</span> {v.year as number}
            </p>
            <p>
              <span className="font-medium">Make:</span> {v.make as string}
            </p>
            <p>
              <span className="font-medium">Model:</span> {v.model as string}
            </p>
            {typeof v.trim === "string" && (
              <p>
                <span className="font-medium">Trim:</span> {v.trim}
              </p>
            )}
            <SpecLine label="Curb Weight" value={v.curb_weight_lbs as number} unit="lbs" source={vehicleSources?.curb_weight_lbs} />
            <SpecLine label="Bay (LxWxH)" value={v.engine_bay_length_in ? `${v.engine_bay_length_in}x${v.engine_bay_width_in}x${v.engine_bay_height_in}` : undefined} unit="in" source={vehicleSources?.engine_bay_length_in} />
            <SpecLine label="Ground Clearance" value={v.stock_ground_clearance_in as number} unit="in" source={vehicleSources?.stock_ground_clearance_in} />
            <SpecLine label="Steering" value={v.steering_type as string} source={vehicleSources?.steering_type} />
          </CardContent>
        </Card>

        {/* Engine card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Engine</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p>
              <span className="font-medium">Make:</span> {e.make as string}
            </p>
            <p>
              <span className="font-medium">Model:</span> {e.model as string}
            </p>
            {typeof e.variant === "string" && (
              <p>
                <span className="font-medium">Variant:</span> {e.variant}
              </p>
            )}
            <SpecLine label="Power" value={e.power_hp as number} unit="HP" source={engineSources?.power_hp} />
            <SpecLine label="Torque" value={e.torque_lb_ft as number} unit="lb-ft" source={engineSources?.torque_lb_ft} />
            <SpecLine label="Displacement" value={e.displacement_liters as number} unit="L" source={engineSources?.displacement_liters} />
            <SpecLine label="Compression" value={e.compression_ratio as number} unit=":1" source={engineSources?.compression_ratio} />
            <SpecLine label="Valve Train" value={e.valve_train as string} source={engineSources?.valve_train} />
            <SpecLine label="Bore/Stroke" value={e.bore_mm ? `${e.bore_mm}/${e.stroke_mm}` : undefined} unit="mm" source={engineSources?.bore_mm} />
            <SpecLine label="Balance" value={e.balance_type as string} source={engineSources?.balance_type} />
            <SpecLine label="Redline" value={e.redline_rpm as number} unit="RPM" source={engineSources?.redline_rpm} />
            <SpecLine label="CAN Bus" value={e.can_bus_protocol as string} source={engineSources?.can_bus_protocol} />
            <SpecLine label="Oil Pan" value={e.oil_pan_depth_in ? `${e.oil_pan_depth_in}" ${e.oil_pan_type ?? ""}` : undefined} source={engineSources?.oil_pan_depth_in} />
          </CardContent>
        </Card>

        {/* Transmission card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transmission</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {t ? (
              <>
                <p>
                  <span className="font-medium">Make:</span> {t.make as string}
                </p>
                <p>
                  <span className="font-medium">Model:</span> {t.model as string}
                </p>
                <SpecLine label="Type" value={t.trans_type as string} source={transSources?.trans_type} />
                <SpecLine label="Gears" value={t.gear_count as number} source={transSources?.gear_count} />
                {typeof t.bellhousing_pattern === "string" && (
                  <p>
                    <span className="font-medium">Bellhousing:</span>{" "}
                    {t.bellhousing_pattern}
                  </p>
                )}
                <SpecLine label="Max Torque" value={t.max_torque_capacity_lb_ft as number} unit="lb-ft" source={transSources?.max_torque_capacity_lb_ft} />
                <SpecLine label="Input Spline" value={t.input_shaft_spline as string} source={transSources?.input_shaft_spline} />
                {t.gear_ratios != null && typeof t.gear_ratios === "object" && (
                  <p>
                    <span className="font-medium">Ratios:</span>{" "}
                    {Object.entries(t.gear_ratios as Record<string, number>)
                      .map(([k, rv]) => `${k}: ${rv}`)
                      .join(", ")}
                    <SourceBadge source={transSources?.gear_ratios} />
                  </p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">No transmission selected</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Source legend */}
      <div className="flex gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500" /> MFR = Manufacturer/OEM
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-blue-500" /> API = External API
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-yellow-500" /> USER = User Contributed
        </span>
      </div>

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <>
          <Separator />
          <div>
            <h3 className="mb-3 text-lg font-semibold">Recommendations</h3>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>
        </>
      )}

      <Separator />

      <Button onClick={handleExportPdf} disabled={downloading}>
        <Download className="mr-2 h-4 w-4" />
        {downloading ? "Exporting..." : "Export PDF Report"}
      </Button>
    </div>
  );
}
