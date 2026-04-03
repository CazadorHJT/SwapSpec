"use client";

import { useEffect, useState } from "react";
import { Trash2, RefreshCw } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  getAdminVehicles,
  getAdminEngines,
  getAdminTransmissions,
  updateVehicleStatus,
  updateEngineStatus,
  updateTransmissionStatus,
  adminDeleteVehicle,
  adminDeleteEngine,
  adminDeleteTransmission,
} from "@/lib/api-client";
import type { Vehicle, Engine, Transmission, QualityStatus } from "@/lib/types";

type DeleteTarget =
  | { type: "vehicle"; id: string; name: string }
  | { type: "engine"; id: string; name: string }
  | { type: "transmission"; id: string; name: string };

function StatusBadge({ status }: { status?: QualityStatus }) {
  if (status === "approved")
    return (
      <Badge variant="outline" className="text-green-500 border-green-500">
        Approved
      </Badge>
    );
  if (status === "rejected")
    return (
      <Badge variant="outline" className="text-destructive border-destructive">
        Rejected
      </Badge>
    );
  return <Badge variant="secondary">Pending</Badge>;
}

export default function CatalogPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [engines, setEngines] = useState<Engine[]>([]);
  const [transmissions, setTransmissions] = useState<Transmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [v, e, t] = await Promise.all([
        getAdminVehicles(),
        getAdminEngines(),
        getAdminTransmissions(),
      ]);
      setVehicles(v.vehicles);
      setEngines(e.engines);
      setTransmissions(t.transmissions);
    } catch {
      toast.error("Failed to load catalog");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "vehicle") {
        await adminDeleteVehicle(deleteTarget.id);
        setVehicles((prev) => prev.filter((v) => v.id !== deleteTarget.id));
      } else if (deleteTarget.type === "engine") {
        await adminDeleteEngine(deleteTarget.id);
        setEngines((prev) => prev.filter((e) => e.id !== deleteTarget.id));
      } else {
        await adminDeleteTransmission(deleteTarget.id);
        setTransmissions((prev) =>
          prev.filter((t) => t.id !== deleteTarget.id),
        );
      }
      toast.success(`${deleteTarget.name} deleted`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      toast.error(msg);
    } finally {
      setDeleteTarget(null);
    }
  }

  async function setVehicleStatus(id: string, status: QualityStatus) {
    try {
      const updated = await updateVehicleStatus(id, status);
      setVehicles((prev) =>
        prev.map((v) =>
          v.id === id ? { ...v, quality_status: updated.quality_status } : v,
        ),
      );
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function setEngineStatus(id: string, status: QualityStatus) {
    try {
      const updated = await updateEngineStatus(id, status);
      setEngines((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, quality_status: updated.quality_status } : e,
        ),
      );
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function setTxStatus(id: string, status: QualityStatus) {
    try {
      const updated = await updateTransmissionStatus(id, status);
      setTransmissions((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, quality_status: updated.quality_status } : t,
        ),
      );
    } catch {
      toast.error("Failed to update status");
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Catalog</h1>
          <p className="text-sm text-muted-foreground">
            All vehicles, engines, and transmissions
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
            Vehicles ({vehicles.length})
          </TabsTrigger>
          <TabsTrigger value="engines">Engines ({engines.length})</TabsTrigger>
          <TabsTrigger value="transmissions">
            Transmissions ({transmissions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vehicles" className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Drive</TableHead>
                <TableHead>Status</TableHead>
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
                  <TableCell>
                    <StatusBadge status={v.quality_status} />
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {v.quality_status !== "approved" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setVehicleStatus(v.id, "approved")}
                      >
                        Approve
                      </Button>
                    )}
                    {v.quality_status !== "rejected" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setVehicleStatus(v.id, "rejected")}
                      >
                        Reject
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() =>
                        setDeleteTarget({
                          type: "vehicle",
                          id: v.id,
                          name: `${v.year} ${v.make} ${v.model}`,
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="engines" className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Engine</TableHead>
                <TableHead>Power</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {engines.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">
                    {e.make} {e.model} {e.variant && `(${e.variant})`}
                  </TableCell>
                  <TableCell>{e.power_hp ? `${e.power_hp} hp` : "—"}</TableCell>
                  <TableCell>
                    <StatusBadge status={e.quality_status} />
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {e.quality_status !== "approved" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEngineStatus(e.id, "approved")}
                      >
                        Approve
                      </Button>
                    )}
                    {e.quality_status !== "rejected" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setEngineStatus(e.id, "rejected")}
                      >
                        Reject
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() =>
                        setDeleteTarget({
                          type: "engine",
                          id: e.id,
                          name: `${e.make} ${e.model}`,
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="transmissions" className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transmission</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
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
                  <TableCell>
                    <StatusBadge status={t.quality_status} />
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {t.quality_status !== "approved" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setTxStatus(t.id, "approved")}
                      >
                        Approve
                      </Button>
                    )}
                    {t.quality_status !== "rejected" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setTxStatus(t.id, "rejected")}
                      >
                        Reject
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() =>
                        setDeleteTarget({
                          type: "transmission",
                          id: t.id,
                          name: `${t.make} ${t.model}`,
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. If any builds reference this item, the
              delete will fail — remove or reassign those builds first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
