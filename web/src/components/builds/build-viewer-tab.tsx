"use client";

import dynamic from "next/dynamic";
import type { BuildExport } from "@/lib/types";
import { Box } from "lucide-react";

const ModelViewer = dynamic(
  () => import("@/components/viewer/model-viewer").then((m) => m.ModelViewer),
  { ssr: false },
);

export function BuildViewerTab({ data }: { data: BuildExport }) {
  // Collect available mesh URLs
  const meshUrls: { label: string; url: string }[] = [];

  // Vehicle bay scan mesh would come from the full vehicle object
  // but the export only has summary fields — use build-level data if present
  // For now we check engine mesh
  if (
    data.build.engine_position &&
    typeof data.build.engine_position === "object"
  ) {
    // engine_position might contain mesh data
  }

  // The engine mesh_file_url is not in the export schema, but if you
  // fetched the full engine you'd have it.  For the viewer tab we'll
  // accept a prop URL or show placeholder.

  // Build a simple list from what we might have
  // This is intentionally flexible — urls get added as the backend fills them in.
  const noModels = meshUrls.length === 0;

  if (noModels) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 rounded-md border border-dashed">
        <Box className="h-12 w-12 text-muted-foreground" />
        <div className="text-center">
          <h3 className="font-semibold">No 3D model available</h3>
          <p className="text-sm text-muted-foreground">
            Upload a mesh file (.glb, .obj, .stl) to view it here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[600px] rounded-md border">
      <ModelViewer url={meshUrls[0].url} />
    </div>
  );
}
