"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { BuildExport } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function BuildDetailHeader({ data }: { data: BuildExport }) {
  const { build, vehicle } = data;
  const v = vehicle as Record<string, unknown>;

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Link href="/dashboard">
        <Button variant="ghost" size="icon">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </Link>
      <div className="flex-1">
        <h1 className="text-2xl font-bold">
          {v.year as number} {v.make as string} {v.model as string}
        </h1>
        <p className="text-sm text-muted-foreground">
          {(v.trim as string) ?? "Build"} &middot;{" "}
          {new Date(build.created_at).toLocaleDateString()}
        </p>
      </div>
      <Badge variant={build.status === "complete" ? "default" : "secondary"}>
        {build.status}
      </Badge>
    </div>
  );
}
