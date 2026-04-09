"use client";

import { use, useEffect } from "react";
import { useApi } from "@/hooks/use-api";
import * as api from "@/lib/api-client";
import { BuildDetailHeader } from "@/components/builds/build-detail-header";
import { BuildOverviewTab } from "@/components/builds/build-overview-tab";
import { BuildAdvisorTab } from "@/components/builds/build-advisor-tab";
import { BuildViewerTab } from "@/components/builds/build-viewer-tab";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useTopBarTabs } from "@/lib/top-bar-context";

const BUILD_TABS = [
  { value: "overview", label: "Overview" },
  { value: "viewer", label: "3D Viewer" },
  { value: "advisor", label: "Advisor" },
];

export default function BuildDetailPage({
  params,
}: {
  params: Promise<{ buildId: string }>;
}) {
  const { buildId } = use(params);
  const { setTabs, clearTabs, activeTab } = useTopBarTabs();
  const { data, loading, error } = useApi(
    () => api.getBuildExport(buildId),
    [buildId],
  );

  useEffect(() => {
    setTabs(BUILD_TABS, "overview");
    return () => clearTabs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      <Tabs value={activeTab || "overview"}>
        <TabsContent value="overview" className="mt-0">
          <BuildOverviewTab data={data} />
        </TabsContent>

        <TabsContent value="viewer" className="mt-0">
          <BuildViewerTab data={data} />
        </TabsContent>

        <TabsContent value="advisor" className="mt-0">
          <BuildAdvisorTab buildId={buildId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
