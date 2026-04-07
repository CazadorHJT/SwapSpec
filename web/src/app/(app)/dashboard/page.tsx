"use client";

import Link from "next/link";
import { Plus, Wrench, CheckCircle2, FileEdit } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import * as api from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { BuildCard } from "@/components/builds/build-card";
import { Skeleton } from "@/components/ui/skeleton";

function StatPill({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{
    className?: string;
    style?: React.CSSProperties;
  }>;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `${color}18` }}
      >
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div>
        <p className="text-xl font-bold tabular-nums leading-none">{value}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, loading } = useApi(() => api.getBuilds(), []);

  const builds = data?.builds ?? [];
  const total = builds.length;
  const complete = builds.filter((b) => b.status === "complete").length;
  const draft = builds.filter((b) => b.status === "draft").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Builds</h1>
        <Link href="/builds/new">
          <Button style={{ background: "oklch(0.65 0.18 245)", color: "#fff" }}>
            <Plus className="mr-2 h-4 w-4" />
            New Build
          </Button>
        </Link>
      </div>

      {/* Stats strip */}
      {!loading && total > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <StatPill
            icon={Wrench}
            label="Total Builds"
            value={total}
            color="oklch(0.65 0.18 245)"
          />
          <StatPill
            icon={CheckCircle2}
            label="Complete"
            value={complete}
            color="oklch(0.70 0.15 145)"
          />
          <StatPill
            icon={FileEdit}
            label="Draft"
            value={draft}
            color="oklch(0.65 0.18 245)"
          />
        </div>
      )}

      {/* Build grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : builds.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {builds.map((build) => (
            <BuildCard key={build.id} build={build} />
          ))}
        </div>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center justify-center gap-5 rounded-xl border border-dashed px-8 py-16 text-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{
              background: "oklch(0.20 0.04 245)",
              border: "1px solid oklch(0.35 0.08 245)",
            }}
          >
            <Wrench
              className="h-8 w-8"
              style={{ color: "oklch(0.65 0.18 245)" }}
            />
          </div>
          <div>
            <h3 className="text-lg font-semibold">No builds yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Start planning your first engine swap. Add your chassis vehicle,
              pick a donor engine, and let the AI advisor guide you through the
              build.
            </p>
          </div>
          <Link href="/builds/new">
            <Button
              style={{ background: "oklch(0.65 0.18 245)", color: "#fff" }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Start Your First Build
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
