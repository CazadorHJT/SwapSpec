"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { BuildExport } from "@/lib/types";
import { Button } from "@/components/ui/button";

export function BuildDetailHeader({ data }: { data: BuildExport }) {
  const { build, vehicle } = data;
  const v = vehicle as Record<string, unknown>;
  const date = new Date(build.created_at).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="flex items-center gap-4">
      <Link href="/dashboard">
        <Button variant="ghost" size="icon" className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </Link>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-2xl font-bold">
          {v.year as number} {v.make as string} {v.model as string}
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {typeof v.trim === "string" ? v.trim : "Build"} &middot; Started{" "}
          {date}
        </p>
      </div>
    </div>
  );
}
