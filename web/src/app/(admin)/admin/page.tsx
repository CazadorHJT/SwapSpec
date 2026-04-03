"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shield, Clock, Users, Wrench, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminStats } from "@/lib/api-client";
import type { AdminStats } from "@/lib/types";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminStats()
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  const pendingTotal = stats
    ? stats.pending_vehicles +
      stats.pending_engines +
      stats.pending_transmissions
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Admin</h1>
          <p className="text-sm text-muted-foreground">
            SwapSpec control panel
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {loading ? "—" : pendingTotal}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {loading ? "—" : stats?.total_users}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Builds
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {loading ? "—" : stats?.total_builds}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {loading ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vehicles</span>
                  <span>{stats?.pending_vehicles}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Engines</span>
                  <span>{stats?.pending_engines}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transmissions</span>
                  <span>{stats?.pending_transmissions}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Navigation cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/admin/approvals">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Approval Queue
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Review pending vehicles, engines, and transmissions submitted by
                users.
              </p>
              {!loading && pendingTotal > 0 && (
                <p className="text-sm font-medium text-amber-500 mt-2">
                  {pendingTotal} items waiting
                </p>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/users">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Users
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Manage user roles, account types, subscriptions, and builds.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/catalog">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  Catalog
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Browse, edit, or delete vehicles, engines, and transmissions in
                the catalog.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
