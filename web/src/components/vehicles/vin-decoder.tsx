"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import * as api from "@/lib/api-client";
import type { VINDecodeResponse } from "@/lib/types";
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

export function VinDecoder() {
  const [vin, setVin] = useState("");
  const [result, setResult] = useState<VINDecodeResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function decode() {
    if (vin.length !== 17) {
      toast.error("VIN must be exactly 17 characters");
      return;
    }
    setLoading(true);
    try {
      const data = await api.decodeVin(vin);
      setResult(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "VIN decode failed");
    } finally {
      setLoading(false);
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
      </CardContent>
    </Card>
  );
}
