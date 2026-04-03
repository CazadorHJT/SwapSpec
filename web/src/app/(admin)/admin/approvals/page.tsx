"use client";

import { useEffect, useState } from "react";
import { Check, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  getAdminVehicles,
  getAdminEngines,
  getAdminTransmissions,
  updateVehicleStatus,
  updateEngineStatus,
  updateTransmissionStatus,
} from "@/lib/api-client";
import type { Vehicle, Engine, Transmission } from "@/lib/types";

export default function ApprovalsPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [engines, setEngines] = useState<Engine[]>([]);
  const [transmissions, setTransmissions] = useState<Transmission[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [v, e, t] = await Promise.all([
        getAdminVehicles("pending"),
        getAdminEngines("pending"),
        getAdminTransmissions("pending"),
      ]);
      setVehicles(v.vehicles);
      setEngines(e.engines);
      setTransmissions(t.transmissions);
    } catch {
      toast.error("Failed to load pending items");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function approveVehicle(id: string) {
    try {
      await updateVehicleStatus(id, "approved");
      setVehicles((prev) => prev.filter((v) => v.id !== id));
      toast.success("Vehicle approved");
    } catch {
      toast.error("Failed to approve vehicle");
    }
  }

  async function rejectVehicle(id: string) {
    try {
      await updateVehicleStatus(id, "rejected");
      setVehicles((prev) => prev.filter((v) => v.id !== id));
      toast.success("Vehicle rejected");
    } catch {
      toast.error("Failed to reject vehicle");
    }
  }

  async function approveEngine(id: string) {
    try {
      await updateEngineStatus(id, "approved");
      setEngines((prev) => prev.filter((e) => e.id !== id));
      toast.success("Engine approved");
    } catch {
      toast.error("Failed to approve engine");
    }
  }

  async function rejectEngine(id: string) {
    try {
      await updateEngineStatus(id, "rejected");
      setEngines((prev) => prev.filter((e) => e.id !== id));
      toast.success("Engine rejected");
    } catch {
      toast.error("Failed to reject engine");
    }
  }

  async function approveTx(id: string) {
    try {
      await updateTransmissionStatus(id, "approved");
      setTransmissions((prev) => prev.filter((t) => t.id !== id));
      toast.success("Transmission approved");
    } catch {
      toast.error("Failed to approve transmission");
    }
  }

  async function rejectTx(id: string) {
    try {
      await updateTransmissionStatus(id, "rejected");
      setTransmissions((prev) => prev.filter((t) => t.id !== id));
      toast.success("Transmission rejected");
    } catch {
      toast.error("Failed to reject transmission");
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Approval Queue</h1>
          <p className="text-sm text-muted-foreground">
            Review user-submitted catalog entries
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="vehicles">
        <TabsList>
          <TabsTrigger value="vehicles">
            Vehicles
            {vehicles.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {vehicles.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="engines">
            Engines
            {engines.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {engines.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="transmissions">
            Transmissions
            {transmissions.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {transmissions.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vehicles" className="mt-4">
          {vehicles.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No pending vehicles
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Drive Type</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">
                      {v.year} {v.make} {v.model} {v.trim && `(${v.trim})`}
                    </TableCell>
                    <TableCell>{v.drive_type ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(v.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => approveVehicle(v.id)}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => rejectVehicle(v.id)}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Reject
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="engines" className="mt-4">
          {engines.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No pending engines
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Engine</TableHead>
                  <TableHead>Power</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {engines.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">
                      {e.make} {e.model} {e.variant && `(${e.variant})`}
                    </TableCell>
                    <TableCell>
                      {e.power_hp ? `${e.power_hp} hp` : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(e.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => approveEngine(e.id)}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => rejectEngine(e.id)}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Reject
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="transmissions" className="mt-4">
          {transmissions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No pending transmissions
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transmission</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transmissions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      {t.make} {t.model}
                    </TableCell>
                    <TableCell>{t.trans_type ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(t.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => approveTx(t.id)}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => rejectTx(t.id)}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Reject
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
