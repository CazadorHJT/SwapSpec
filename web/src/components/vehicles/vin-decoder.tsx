"use client";

import { useState } from "react";
import { Search, Plus, ArrowRight } from "lucide-react";
import * as api from "@/lib/api-client";
import type { VINDecodeResponse, Vehicle } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

interface VinDecoderProps {
  onVehicleCreated?: (vehicle: Vehicle) => void;
  existingVehicles?: Vehicle[];
}

export function VinDecoder({ onVehicleCreated, existingVehicles }: VinDecoderProps) {
  const [vin, setVin] = useState("");
  const [result, setResult] = useState<VINDecodeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [duplicate, setDuplicate] = useState<Vehicle | null>(null);

  const canAdd = result?.year && result?.make && result?.model;

  async function decode() {
    if (vin.length !== 17) {
      toast.error("VIN must be exactly 17 characters");
      return;
    }
    setLoading(true);
    setDuplicate(null);
    try {
      const data = await api.decodeVin(vin);
      setResult(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "VIN decode failed");
    } finally {
      setLoading(false);
    }
  }

  function findDuplicate(): Vehicle | undefined {
    if (!existingVehicles || !result?.year || !result?.make || !result?.model) return undefined;
    return existingVehicles.find(
      (v) =>
        v.quality_status === "approved" &&
        v.year === result.year &&
        v.make.toLowerCase() === result.make!.toLowerCase() &&
        v.model.toLowerCase() === result.model!.toLowerCase()
    );
  }

  async function handleAdd() {
    if (!canAdd) return;

    const existing = findDuplicate();
    if (existing && !duplicate) {
      setDuplicate(existing);
      return;
    }

    setAdding(true);
    try {
      const vehicle = await api.createVehicle({
        year: result!.year!,
        make: result!.make!,
        model: result!.model!,
        trim: result!.trim,
        vin_pattern: vin,
      });
      toast.success("Vehicle added!");
      onVehicleCreated?.(vehicle);
      setResult(null);
      setVin("");
      setDuplicate(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add vehicle");
    } finally {
      setAdding(false);
    }
  }

  function handleUseExisting() {
    if (duplicate) {
      onVehicleCreated?.(duplicate);
      setResult(null);
      setVin("");
      setDuplicate(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">VIN Decoder</CardTitle>
        <CardDescription>
          Enter a 17-character VIN to decode vehicle information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 space-y-1">
            <Label htmlFor="vin-input" className="sr-only">
              VIN
            </Label>
            <Input
              id="vin-input"
              placeholder="Enter 17-character VIN"
              value={vin}
              onChange={(e) => setVin(e.target.value.toUpperCase())}
              maxLength={17}
            />
          </div>
          <Button onClick={decode} disabled={loading || vin.length !== 17}>
            <Search className="mr-2 h-4 w-4" />
            {loading ? "Decoding..." : "Decode"}
          </Button>
        </div>

        {result && (
          <div className="rounded-md border p-4 text-sm space-y-1">
            {result.year && (
              <p>
                <span className="font-medium">Year:</span> {result.year}
              </p>
            )}
            {result.make && (
              <p>
                <span className="font-medium">Make:</span> {result.make}
              </p>
            )}
            {result.model && (
              <p>
                <span className="font-medium">Model:</span> {result.model}
              </p>
            )}
            {result.trim && (
              <p>
                <span className="font-medium">Trim:</span> {result.trim}
              </p>
            )}
            {result.engine && (
              <p>
                <span className="font-medium">Engine:</span> {result.engine}
              </p>
            )}
          </div>
        )}

        {result && canAdd && onVehicleCreated && (
          <>
            {duplicate ? (
              <div className="rounded-md border border-yellow-500/50 bg-yellow-500/10 p-4 text-sm space-y-3">
                <p>
                  A matching approved vehicle already exists:{" "}
                  <span className="font-medium">
                    {duplicate.year} {duplicate.make} {duplicate.model}
                    {duplicate.trim ? ` ${duplicate.trim}` : ""}
                  </span>
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleUseExisting}>
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Use Existing
                  </Button>
                  <Button size="sm" variant="secondary" onClick={handleAdd} disabled={adding}>
                    <Plus className="mr-2 h-4 w-4" />
                    {adding ? "Adding..." : "Add Anyway"}
                  </Button>
                </div>
              </div>
            ) : (
              <Button onClick={handleAdd} disabled={adding} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                {adding ? "Adding..." : "Add This Vehicle"}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
