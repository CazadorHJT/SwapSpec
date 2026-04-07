"use client";

import { use, useState } from "react";
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
  const [activeTab, setActiveTab] = useState("overview");
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* Sticky tab bar */}
        <div className="sticky top-14 z-10 -mx-6 px-6 md:-mx-8 md:px-8 border-b bg-background">
          <TabsList className="h-10 bg-transparent p-0 gap-0 rounded-none w-full justify-start">
            {(["overview", "viewer", "advisor"] as const).map((tab) => {
              const labels: Record<string, string> = {
                overview: "Overview",
                viewer: "3D Viewer",
                advisor: "Advisor",
              };
              return (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className="relative h-10 rounded-none border-b-2 border-transparent px-4 text-sm font-medium text-muted-foreground transition-colors data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none bg-transparent hover:text-foreground"
                >
                  {labels[tab]}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

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
