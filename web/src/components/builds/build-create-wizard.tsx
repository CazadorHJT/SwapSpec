"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Plus, Loader2 } from "lucide-react";
import * as api from "@/lib/api-client";
import type {
  Vehicle,
  Engine,
  Transmission,
  EngineFamily,
  EngineFamilyVariant,
  TransmissionGroups,
  EngineIdentifySuggestion,
  TransmissionIdentifySuggestion,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VinDecoder } from "@/components/vehicles/vin-decoder";
import { VehicleFilters } from "@/components/vehicles/vehicle-filters";
import { VehicleTable } from "@/components/vehicles/vehicle-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useApi } from "@/hooks/use-api";
import { useEngineFamilies } from "@/hooks/use-engines";
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

  // Step 0 vehicle filters
  const [vYear, setVYear] = useState("");
  const [vMake, setVMake] = useState("");
  const [vModel, setVModel] = useState("");
  const [vDriveType, setVDriveType] = useState("");
  const [vBodyStyle, setVBodyStyle] = useState("");

  // Step 1: engine family drill-down
  const [eFamilyMake, setEFamilyMake] = useState("");
  const [selectedFamily, setSelectedFamily] = useState<EngineFamily | null>(
    null,
  );

  // Add engine dialog
  const [addEngineOpen, setAddEngineOpen] = useState(false);
  const [engineQuery, setEngineQuery] = useState("");
  const [engineQueryLoading, setEngineQueryLoading] = useState(false);
  const [engineSuggestions, setEngineSuggestions] = useState<
    EngineIdentifySuggestion[]
  >([]);
  const [engineExistingId, setEngineExistingId] = useState<string | null>(null);
  const [engineDonorYear, setEngineDonorYear] = useState("");
  const [engineDonorMake, setEngineDonorMake] = useState("");
  const [engineDonorModel, setEngineDonorModel] = useState("");
  const [selectedEngineSug, setSelectedEngineSug] =
    useState<EngineIdentifySuggestion | null>(null);

  // Add transmission dialog
  const [addTransOpen, setAddTransOpen] = useState(false);
  const [transQuery, setTransQuery] = useState("");
  const [transQueryLoading, setTransQueryLoading] = useState(false);
  const [transSuggestions, setTransSuggestions] = useState<
    TransmissionIdentifySuggestion[]
  >([]);
  const [transExistingId, setTransExistingId] = useState<string | null>(null);
  const [transDonorYear, setTransDonorYear] = useState("");
  const [transDonorMake, setTransDonorMake] = useState("");
  const [transDonorModel, setTransDonorModel] = useState("");
  const [selectedTransSug, setSelectedTransSug] =
    useState<TransmissionIdentifySuggestion | null>(null);

  const vehicleParams = {
    year: vYear ? parseInt(vYear) : undefined,
    make: vMake || undefined,
    model: vModel || undefined,
    drive_type: vDriveType || undefined,
    body_style: vBodyStyle || undefined,
  };
  const vehicleData = useApi(
    () => api.getVehicles(vehicleParams),
    [vYear, vMake, vModel, vDriveType, vBodyStyle],
  );

  const familiesData = useEngineFamilies(eFamilyMake || undefined);

  const transGroupsData = useApi(
    () =>
      engine
        ? api.getTransmissionsForBuild(engine.id, vehicle?.id)
        : Promise.resolve(null),
    [engine?.id, vehicle?.id],
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
      toast.error(
        err instanceof Error ? err.message : "Failed to create build",
      );
    } finally {
      setCreating(false);
    }
  }, [vehicle, engine, transmission, router]);

  // Engine identify handler
  const handleEngineSearch = async () => {
    if (!engineQuery.trim()) return;
    setEngineQueryLoading(true);
    try {
      const result = await api.identifyEngine(engineQuery);
      setEngineSuggestions(result.suggestions);
      setEngineExistingId(result.existing_match_id ?? null);
    } catch {
      toast.error("AI identification failed.");
    } finally {
      setEngineQueryLoading(false);
    }
  };

  const handleSelectEngineSuggestion = (sug: EngineIdentifySuggestion) => {
    setSelectedEngineSug(sug);
    setEngineDonorYear(sug.origin_year ? String(sug.origin_year) : "");
    setEngineDonorMake(sug.origin_make ?? "");
    setEngineDonorModel(sug.origin_model ?? "");
  };

  const handleConfirmEngineSuggestion = async () => {
    if (!selectedEngineSug) return;
    const sug = selectedEngineSug;
    if (engineExistingId) {
      try {
        const existing = await api.getEngine(engineExistingId);
        setEngine(existing);
        setAddEngineOpen(false);
        toast.success(
          `Selected existing engine: ${existing.make} ${existing.model}`,
        );
      } catch {
        toast.error("Failed to load existing engine.");
      }
      return;
    }
    try {
      const created = await api.createEngine({
        make: sug.make,
        model: sug.model,
        variant: sug.variant,
        engine_family: sug.engine_family,
        displacement_liters: sug.displacement_liters,
        power_hp: sug.power_hp,
        torque_lb_ft: sug.torque_lb_ft,
        origin_year: engineDonorYear
          ? parseInt(engineDonorYear)
          : sug.origin_year,
        origin_make: engineDonorMake || sug.origin_make,
        origin_model: engineDonorModel || sug.origin_model,
        origin_variant: sug.origin_variant,
      } as Parameters<typeof api.createEngine>[0]);
      setEngine(created);
      setAddEngineOpen(false);
      toast.success(`Created and selected: ${created.make} ${created.model}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create engine.",
      );
    }
  };

  // Transmission identify handler
  const handleTransSearch = async () => {
    if (!transQuery.trim()) return;
    setTransQueryLoading(true);
    try {
      const result = await api.identifyTransmission(transQuery);
      setTransSuggestions(result.suggestions);
      setTransExistingId(result.existing_match_id ?? null);
    } catch {
      toast.error("AI identification failed.");
    } finally {
      setTransQueryLoading(false);
    }
  };

  const handleSelectTransSuggestion = (sug: TransmissionIdentifySuggestion) => {
    setSelectedTransSug(sug);
    setTransDonorYear(sug.origin_year ? String(sug.origin_year) : "");
    setTransDonorMake(sug.origin_make ?? "");
    setTransDonorModel(sug.origin_model ?? "");
  };

  const handleConfirmTransSuggestion = async () => {
    if (!selectedTransSug) return;
    const sug = selectedTransSug;
    if (transExistingId) {
      try {
        const existing = await api.getTransmission(transExistingId);
        setTransmission(existing);
        setAddTransOpen(false);
        toast.success(`Selected existing: ${existing.make} ${existing.model}`);
      } catch {
        toast.error("Failed to load existing transmission.");
      }
      return;
    }
    try {
      const created = await api.createTransmission({
        make: sug.make,
        model: sug.model,
        trans_type: sug.trans_type,
        gear_count: sug.gear_count,
        bellhousing_pattern: sug.bellhousing_pattern,
        max_torque_capacity_lb_ft: sug.max_torque_capacity_lb_ft,
        drivetrain_type: sug.drivetrain_type,
        origin_year: transDonorYear
          ? parseInt(transDonorYear)
          : sug.origin_year,
        origin_make: transDonorMake || sug.origin_make,
        origin_model: transDonorModel || sug.origin_model,
        origin_variant: sug.origin_variant,
      } as Parameters<typeof api.createTransmission>[0]);
      setTransmission(created);
      setAddTransOpen(false);
      toast.success(`Created and selected: ${created.make} ${created.model}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create transmission.",
      );
    }
  };

  const groups: TransmissionGroups | null = transGroupsData.data ?? null;

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
                i <= step
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
            {i < STEPS.length - 1 && <Separator className="w-6" />}
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
                driveType={vDriveType}
                bodyStyle={vBodyStyle}
                onYearChange={setVYear}
                onMakeChange={setVMake}
                onModelChange={setVModel}
                onDriveTypeChange={setVDriveType}
                onBodyStyleChange={setVBodyStyle}
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

          {/* Step 1: Engine — Family → Variant drill-down */}
          {step === 1 && (
            <div className="space-y-4">
              {!selectedFamily ? (
                <>
                  {/* Family picker */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Filter by manufacturer…"
                      value={eFamilyMake}
                      onChange={(e) => setEFamilyMake(e.target.value)}
                      className="max-w-xs"
                    />
                  </div>
                  {familiesData.loading ? (
                    <Skeleton className="h-48 w-full" />
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {(familiesData.data ?? []).map((fam) => (
                        <EngineFamilyCard
                          key={fam.family}
                          family={fam}
                          onClick={() => {
                            if (fam.variants.length === 1) {
                              // Auto-select if only one variant
                              void (async () => {
                                const eng = await api.getEngine(
                                  fam.variants[0].id,
                                );
                                setEngine(eng);
                              })();
                            } else {
                              setSelectedFamily(fam);
                            }
                          }}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Variant picker */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFamily(null)}
                    className="mb-2 -ml-2"
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Back to families
                  </Button>
                  <p className="text-sm text-muted-foreground mb-3">
                    {selectedFamily.make} — {selectedFamily.family} family
                  </p>
                  <div className="grid gap-2">
                    {selectedFamily.variants.map((v) => (
                      <EngineVariantCard
                        key={v.id}
                        variant={v}
                        selected={engine?.id === v.id}
                        onClick={async () => {
                          const eng = await api.getEngine(v.id);
                          setEngine(eng);
                          setSelectedFamily(null);
                        }}
                      />
                    ))}
                  </div>
                </>
              )}

              {engine && (
                <p className="text-sm">
                  Selected:{" "}
                  <Badge variant="secondary">
                    {engine.make} {engine.model} {engine.variant ?? ""}
                  </Badge>
                </p>
              )}

              <Separator />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEngineQuery("");
                  setEngineSuggestions([]);
                  setEngineExistingId(null);
                  setSelectedEngineSug(null);
                  setEngineDonorYear("");
                  setEngineDonorMake("");
                  setEngineDonorModel("");
                  setAddEngineOpen(true);
                }}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Different Engine
              </Button>
            </div>
          )}

          {/* Step 2: Transmission — grouped */}
          {step === 2 && (
            <div className="space-y-5">
              {transGroupsData.loading && <Skeleton className="h-48 w-full" />}

              {groups && (
                <>
                  {/* Stock for engine */}
                  {groups.stock_for_engine.length > 0 && (
                    <TransmissionSection
                      title="Stock with this engine"
                      description={
                        engine
                          ? `These came factory with the ${engine.make} ${engine.model} in its donor vehicle.`
                          : undefined
                      }
                      transmissions={groups.stock_for_engine}
                      selected={transmission}
                      onSelect={setTransmission}
                    />
                  )}

                  {/* Chassis original */}
                  {groups.chassis_original_label && (
                    <div className="rounded-md border p-3 bg-muted/30">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                        Original chassis transmission
                      </p>
                      <p className="text-sm">
                        The {vehicle?.year} {vehicle?.make} {vehicle?.model}{" "}
                        came with a{" "}
                        <span className="font-medium">
                          {groups.chassis_original_label}
                        </span>
                        .
                      </p>
                      {groups.chassis_original.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {groups.chassis_original.map((t) => (
                            <TransmissionCard
                              key={t.id}
                              trans={t}
                              selected={transmission?.id === t.id}
                              onSelect={setTransmission}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Other compatible */}
                  {groups.other_compatible.length > 0 && (
                    <TransmissionSection
                      title="Other compatible transmissions"
                      transmissions={groups.other_compatible}
                      selected={transmission}
                      onSelect={setTransmission}
                      showTypeFilter
                    />
                  )}

                  {groups.stock_for_engine.length === 0 &&
                    groups.chassis_original.length === 0 &&
                    groups.other_compatible.length === 0 && (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        No compatible transmissions found. You can add one
                        below.
                      </p>
                    )}
                </>
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

              <Separator />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTransQuery("");
                  setTransSuggestions([]);
                  setTransExistingId(null);
                  setSelectedTransSug(null);
                  setTransDonorYear("");
                  setTransDonorMake("");
                  setTransDonorModel("");
                  setAddTransOpen(true);
                }}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Different Transmission
              </Button>
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
            onClick={() => {
              if (step === 1 && selectedFamily) {
                setSelectedFamily(null);
              } else {
                setStep((s) => s - 1);
              }
            }}
            disabled={step === 0}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>

          {step < 3 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
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

      {/* Add Engine Dialog */}
      <Dialog open={addEngineOpen} onOpenChange={setAddEngineOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add a Different Engine</DialogTitle>
            <DialogDescription>
              Describe the engine you want — AI will identify it and suggest
              specs.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder='e.g. "cummins 12 valve" or "k24 turbo"'
                value={engineQuery}
                onChange={(e) => setEngineQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEngineSearch()}
              />
              <Button
                onClick={handleEngineSearch}
                disabled={engineQueryLoading}
              >
                {engineQueryLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Search"
                )}
              </Button>
            </div>
            {engineSuggestions.length > 0 && (
              <div className="space-y-2">
                {engineExistingId && (
                  <p className="text-xs text-muted-foreground">
                    This engine already exists in the database — selecting it
                    will use the existing entry.
                  </p>
                )}
                {engineSuggestions.map((sug, i) => (
                  <div
                    key={i}
                    className={`rounded-md border p-3 cursor-pointer transition-colors ${selectedEngineSug === sug ? "border-primary bg-primary/5" : "hover:bg-accent"}`}
                    onClick={() => handleSelectEngineSuggestion(sug)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">
                        {sug.make} {sug.model} {sug.variant ?? ""}
                      </span>
                      <Badge
                        variant={
                          sug.confidence === "high" ? "default" : "secondary"
                        }
                        className="text-xs"
                      >
                        {sug.confidence}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {[
                        sug.displacement_liters
                          ? `${sug.displacement_liters}L`
                          : null,
                        sug.power_hp ? `${sug.power_hp} HP` : null,
                        sug.torque_lb_ft ? `${sug.torque_lb_ft} lb-ft` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {sug.explanation && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {sug.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
            {selectedEngineSug && (
              <div className="rounded-md border p-3 space-y-3 bg-muted/30">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Donor Vehicle
                  </p>
                  <p className="text-xs text-muted-foreground mb-2">
                    The vehicle this engine came from — used to find the correct
                    factory service manual.
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">Year</Label>
                      <Input
                        type="number"
                        placeholder="e.g. 1998"
                        value={engineDonorYear}
                        onChange={(e) => setEngineDonorYear(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Make</Label>
                      <Input
                        placeholder="e.g. Chevrolet"
                        value={engineDonorMake}
                        onChange={(e) => setEngineDonorMake(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Model</Label>
                      <Input
                        placeholder="e.g. Camaro"
                        value={engineDonorModel}
                        onChange={(e) => setEngineDonorModel(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={handleConfirmEngineSuggestion}
                >
                  Confirm Selection
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Transmission Dialog */}
      <Dialog open={addTransOpen} onOpenChange={setAddTransOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add a Different Transmission</DialogTitle>
            <DialogDescription>
              Describe the transmission you want — AI will identify it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder='e.g. "t56 magnum" or "zf8 automatic"'
                value={transQuery}
                onChange={(e) => setTransQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTransSearch()}
              />
              <Button onClick={handleTransSearch} disabled={transQueryLoading}>
                {transQueryLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Search"
                )}
              </Button>
            </div>
            {transSuggestions.length > 0 && (
              <div className="space-y-2">
                {transExistingId && (
                  <p className="text-xs text-muted-foreground">
                    This transmission already exists — selecting it will use the
                    existing entry.
                  </p>
                )}
                {transSuggestions.map((sug, i) => (
                  <div
                    key={i}
                    className={`rounded-md border p-3 cursor-pointer transition-colors ${selectedTransSug === sug ? "border-primary bg-primary/5" : "hover:bg-accent"}`}
                    onClick={() => handleSelectTransSuggestion(sug)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">
                        {sug.make} {sug.model}
                      </span>
                      <Badge
                        variant={
                          sug.confidence === "high" ? "default" : "secondary"
                        }
                        className="text-xs"
                      >
                        {sug.confidence}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {[
                        sug.trans_type,
                        sug.gear_count ? `${sug.gear_count}-speed` : null,
                        sug.max_torque_capacity_lb_ft
                          ? `${sug.max_torque_capacity_lb_ft} lb-ft max`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {sug.explanation && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {sug.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
            {selectedTransSug && (
              <div className="rounded-md border p-3 space-y-3 bg-muted/30">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Donor Vehicle
                  </p>
                  <p className="text-xs text-muted-foreground mb-2">
                    The vehicle this transmission came from — used to find the
                    correct factory service manual.
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">Year</Label>
                      <Input
                        type="number"
                        placeholder="e.g. 2002"
                        value={transDonorYear}
                        onChange={(e) => setTransDonorYear(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Make</Label>
                      <Input
                        placeholder="e.g. Chevrolet"
                        value={transDonorMake}
                        onChange={(e) => setTransDonorMake(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Model</Label>
                      <Input
                        placeholder="e.g. Camaro"
                        value={transDonorModel}
                        onChange={(e) => setTransDonorModel(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={handleConfirmTransSuggestion}
                >
                  Confirm Selection
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function EngineFamilyCard({
  family,
  onClick,
}: {
  family: EngineFamily;
  onClick: () => void;
}) {
  const hpValues = family.variants
    .map((v) => v.power_hp)
    .filter(Boolean) as number[];
  const hpMin = hpValues.length ? Math.min(...hpValues) : null;
  const hpMax = hpValues.length ? Math.max(...hpValues) : null;

  return (
    <button
      onClick={onClick}
      className="rounded-lg border p-4 text-left hover:bg-accent hover:border-foreground/20 transition-colors w-full"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{family.family}</p>
          <p className="text-xs text-muted-foreground">{family.make}</p>
        </div>
        <Badge variant="secondary" className="shrink-0 text-xs">
          {family.variants.length}{" "}
          {family.variants.length === 1 ? "variant" : "variants"}
        </Badge>
      </div>
      {hpMin !== null && hpMax !== null && (
        <p className="text-xs text-muted-foreground mt-2">
          {hpMin === hpMax ? `${hpMin} HP` : `${hpMin}–${hpMax} HP`}
        </p>
      )}
    </button>
  );
}

function EngineVariantCard({
  variant,
  selected,
  onClick,
}: {
  variant: EngineFamilyVariant;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border p-3 text-left transition-colors w-full flex items-center gap-3 ${
        selected ? "border-primary bg-primary/5" : "hover:bg-accent"
      }`}
    >
      <div
        className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
          selected ? "border-primary bg-primary" : "border-muted-foreground"
        }`}
      >
        {selected && <Check className="h-3 w-3 text-primary-foreground" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{variant.model}</p>
        <p className="text-xs text-muted-foreground">
          {[
            variant.variant,
            variant.displacement_liters
              ? `${variant.displacement_liters}L`
              : null,
            variant.power_hp ? `${variant.power_hp} HP` : null,
            variant.torque_lb_ft ? `${variant.torque_lb_ft} lb-ft` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
    </button>
  );
}

function TransmissionCard({
  trans,
  selected,
  onSelect,
}: {
  trans: Transmission;
  selected: boolean;
  onSelect: (t: Transmission) => void;
}) {
  return (
    <button
      onClick={() => onSelect(trans)}
      className={`rounded-lg border p-3 text-left transition-colors w-full flex items-center gap-3 ${
        selected ? "border-primary bg-primary/5" : "hover:bg-accent"
      }`}
    >
      <div
        className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
          selected ? "border-primary bg-primary" : "border-muted-foreground"
        }`}
      >
        {selected && <Check className="h-3 w-3 text-primary-foreground" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">
            {trans.make} {trans.model}
          </span>
          {trans.trans_type && (
            <Badge variant="outline" className="text-xs">
              {trans.trans_type}
            </Badge>
          )}
          {trans.drivetrain_type && (
            <Badge variant="secondary" className="text-xs">
              {trans.drivetrain_type === "4WD"
                ? "4WD (transfer case)"
                : trans.drivetrain_type}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {[
            trans.gear_count ? `${trans.gear_count}-speed` : null,
            trans.max_torque_capacity_lb_ft
              ? `${trans.max_torque_capacity_lb_ft} lb-ft max`
              : null,
            trans.weight ? `${trans.weight} lbs` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
    </button>
  );
}

function TransmissionSection({
  title,
  description,
  transmissions,
  selected,
  onSelect,
  showTypeFilter,
}: {
  title: string;
  description?: string;
  transmissions: Transmission[];
  selected: Transmission | null;
  onSelect: (t: Transmission) => void;
  showTypeFilter?: boolean;
}) {
  const [typeFilter, setTypeFilter] = useState<"all" | "Manual" | "Automatic">(
    "all",
  );

  const hasManual = transmissions.some((t) => t.trans_type === "Manual");
  const hasAuto = transmissions.some((t) => t.trans_type === "Automatic");
  const showFilter = showTypeFilter && hasManual && hasAuto;

  const filtered =
    typeFilter === "all"
      ? transmissions
      : transmissions.filter((t) => t.trans_type === typeFilter);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-medium">{title}</p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {showFilter && (
          <div className="flex gap-1">
            {(["all", "Manual", "Automatic"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setTypeFilter(f)}
                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                  typeFilter === f
                    ? "bg-primary text-primary-foreground border-primary"
                    : "hover:bg-accent"
                }`}
              >
                {f === "all" ? "All" : f}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-1">
        {filtered.map((t) => (
          <TransmissionCard
            key={t.id}
            trans={t}
            selected={selected?.id === t.id}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}
