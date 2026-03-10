"use client";

import Link from "next/link";
import { Calendar, Cog, Gauge } from "lucide-react";
import type { Build } from "@/lib/types";
import { useApi } from "@/hooks/use-api";
import * as api from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function BuildCard({ build }: { build: Build }) {
  const date = new Date(build.created_at).toLocaleDateString();
  const { data: vehicle } = useApi(() => api.getVehicle(build.vehicle_id), [build.vehicle_id]);
  const { data: engine } = useApi(() => api.getEngine(build.engine_id), [build.engine_id]);
  const { data: transmission } = useApi(
    () => build.transmission_id ? api.getTransmission(build.transmission_id) : Promise.resolve(null),
    [build.transmission_id],
  );

  const title = vehicle
    ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
    : "Build";

  return (
    <Link href={`/builds/${build.id}`}>
      <Card className="transition-colors hover:bg-accent/50 cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base truncate mr-2">
              {title}
            </CardTitle>
            <Badge variant={build.status === "complete" ? "default" : "secondary"}>
              {build.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {engine && (
            <div className="flex items-center gap-2">
              <Cog className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {engine.make} {engine.model} {engine.variant ?? ""}
              </span>
            </div>
          )}
          {transmission && (
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 shrink-0" />
              <span className="truncate">{transmission.make} {transmission.model}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>{date}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
