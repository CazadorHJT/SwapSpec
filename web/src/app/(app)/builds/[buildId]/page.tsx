"use client";

import { use } from "react";
import { useApi } from "@/hooks/use-api";
import * as api from "@/lib/api-client";
import { BuildDetailHeader } from "@/components/builds/build-detail-header";
import { BuildOverviewTab } from "@/components/builds/build-overview-tab";
import { BuildAdvisorTab } from "@/components/builds/build-advisor-tab";
import { BuildViewerTab } from "@/components/builds/build-viewer-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

export default function BuildDetailPage({
  params,
}: {
  params: Promise<{ buildId: string }>;
}) {
  const { buildId } = use(params);
  const { data, loading, error } = useApi(
    () => api.getBuildExport(buildId),
    [buildId],
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-destructive">{error ?? "Build not found"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BuildDetailHeader data={data} />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="viewer">3D Viewer</TabsTrigger>
          <TabsTrigger value="advisor">Advisor</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <BuildOverviewTab data={data} />
        </TabsContent>

        <TabsContent value="viewer" className="mt-4">
          <BuildViewerTab data={data} />
        </TabsContent>

        <TabsContent value="advisor" className="mt-4">
          <BuildAdvisorTab buildId={buildId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
