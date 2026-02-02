"use client";

import Link from "next/link";
import { Plus, Wrench } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import * as api from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { BuildCard } from "@/components/builds/build-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { data, loading } = useApi(() => api.getBuilds(), []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Builds</h1>
        <Link href="/builds/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Build
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      ) : data && data.builds.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.builds.map((build) => (
            <BuildCard key={build.id} build={build} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-12 text-center">
          <Wrench className="h-12 w-12 text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold">No builds yet</h3>
            <p className="text-sm text-muted-foreground">
              Create your first engine swap build to get started.
            </p>
          </div>
          <Link href="/builds/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Build
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
