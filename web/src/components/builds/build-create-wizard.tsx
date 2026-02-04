"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import * as api from "@/lib/api-client";
import type { Vehicle, Engine, Transmission } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VinDecoder } from "@/components/vehicles/vin-decoder";
import { VehicleFilters } from "@/components/vehicles/vehicle-filters";
import { VehicleTable } from "@/components/vehicles/vehicle-table";
import { EngineFilters } from "@/components/engines/engine-filters";
import { EngineTable } from "@/components/engines/engine-table";
import { TransmissionTable } from "@/components/transmissions/transmission-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useApi } from "@/hooks/use-api";
import { toast } from "sonner";

const STEPS = [
  "Select Vehicle",
  "Select Engine",
  "Select Transmission",
  "Review & Create",
];

export function BuildCreateWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [creating, setCreating] = useState(false);

  // Selections
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [engine, setEngine] = useState<Engine | null>(null);
  const [transmission, setTransmission] = useState<Transmission | null>(null);

  // Step 1 filters
  const [vYear, setVYear] = useState("");
  const [vMake, setVMake] = useState("");
  const [vModel, setVModel] = useState("");

  // Step 2 filters
  const [eMake, setEMake] = useState("");
  const [eHpRange, setEHpRange] = useState<[number, number]>([0, 2000]);

  const vehicleParams = {
    year: vYear ? parseInt(vYear) : undefined,
    make: vMake || undefined,
    model: vModel || undefined,
  };
  const vehicleData = useApi(
    () => api.getVehicles(vehicleParams),
    [vYear, vMake, vModel],
  );

  const engineParams = {
    make: eMake || undefined,
    min_hp: eHpRange[0] > 0 ? eHpRange[0] : undefined,
    max_hp: eHpRange[1] < 2000 ? eHpRange[1] : undefined,
  };
  const engineData = useApi(
    () => api.getEngines(engineParams),
    [eMake, eHpRange[0], eHpRange[1]],
  );

  const transData = useApi(
    () =>
      engine
        ? api.getCompatibleTransmissions(engine.id)
        : Promise.resolve({ transmissions: [], total: 0 }),
    [engine?.id],
  );

  const handleVinVehicleCreated = useCallback(
    (v: Vehicle) => {
      setVehicle(v);
      vehicleData.refetch();
    },
    [vehicleData],
  );

  const canNext =
    (step === 0 && vehicle !== null) ||
    (step === 1 && engine !== null) ||
    step === 2 ||
    step === 3;

  const handleCreate = useCallback(async () => {
    if (!vehicle || !engine) return;
    setCreating(true);
    try {
      const build = await api.createBuild({
        vehicle_id: vehicle.id,
        engine_id: engine.id,
        transmission_id: transmission?.id,
      });
      toast.success("Build created!");
      router.push(`/builds/${build.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create build");
    } finally {
      setCreating(false);
    }
  }, [vehicle, engine, transmission, router]);

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
                i < step
                  ? "bg-primary text-primary-foreground"
                  : i === step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span
              className={`hidden text-sm sm:inline ${
                i === step ? "font-medium" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <Separator className="w-6" />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[step]}</CardTitle>
          <CardDescription>
            {step === 0 && "Choose the vehicle for your engine swap build."}
            {step === 1 && "Choose the engine you want to install."}
            {step === 2 &&
              "Optionally select a compatible transmission, or skip."}
            {step === 3 && "Review your selections and create the build."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Step 0: Vehicle */}
          {step === 0 && (
            <div className="space-y-4">
              <VinDecoder
                onVehicleCreated={handleVinVehicleCreated}
                existingVehicles={vehicleData.data?.vehicles}
              />

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    or select from existing
                  </span>
                </div>
              </div>

              <VehicleFilters
                year={vYear}
                make={vMake}
                model={vModel}
                onYearChange={setVYear}
                onMakeChange={setVMake}
                onModelChange={setVModel}
              />
              {vehicleData.loading ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <VehicleTable
                  vehicles={vehicleData.data?.vehicles ?? []}
                  onSelect={(v) => setVehicle(v)}
                />
              )}
              {vehicle && (
                <p className="text-sm">
                  Selected:{" "}
                  <Badge variant="secondary">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </Badge>
                </p>
              )}
            </div>
          )}

          {/* Step 1: Engine */}
          {step === 1 && (
            <div className="space-y-4">
              <EngineFilters
                make={eMake}
                hpRange={eHpRange}
                onMakeChange={setEMake}
                onHpRangeChange={setEHpRange}
              />
              {engineData.loading ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <EngineTable
                  engines={engineData.data?.engines ?? []}
                  onSelect={(e) => setEngine(e)}
                />
              )}
              {engine && (
                <p className="text-sm">
                  Selected:{" "}
                  <Badge variant="secondary">
                    {engine.make} {engine.model} {engine.variant ?? ""}
                  </Badge>
                </p>
              )}
            </div>
          )}

          {/* Step 2: Transmission */}
          {step === 2 && (
            <div className="space-y-4">
              {transData.loading ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <TransmissionTable
                  transmissions={transData.data?.transmissions ?? []}
                  onSelect={(t) => setTransmission(t)}
                />
              )}
              {transmission ? (
                <p className="text-sm">
                  Selected:{" "}
                  <Badge variant="secondary">
                    {transmission.make} {transmission.model}
                  </Badge>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No transmission selected (optional).
                </p>
              )}
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-4 text-sm">
              <div className="rounded-md border p-4 space-y-2">
                <p className="font-medium">Vehicle</p>
                <p>
                  {vehicle?.year} {vehicle?.make} {vehicle?.model}{" "}
                  {vehicle?.trim ?? ""}
                </p>
              </div>
              <div className="rounded-md border p-4 space-y-2">
                <p className="font-medium">Engine</p>
                <p>
                  {engine?.make} {engine?.model} {engine?.variant ?? ""}{" "}
                  {engine?.power_hp ? `(${engine.power_hp} HP)` : ""}
                </p>
              </div>
              <div className="rounded-md border p-4 space-y-2">
                <p className="font-medium">Transmission</p>
                <p>
                  {transmission
                    ? `${transmission.make} ${transmission.model}`
                    : "None selected"}
                </p>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>

          {step < 3 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext}
            >
              {step === 2 ? "Review" : "Next"}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Creating..." : "Create Build"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
