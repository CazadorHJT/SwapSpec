"use client";

import { useApi } from "./use-api";
import * as api from "@/lib/api-client";

export function useBuilds(params?: { skip?: number; limit?: number }) {
  return useApi(
    () => api.getBuilds(params),
    [params?.skip, params?.limit],
  );
}

export function useBuild(id: string) {
  return useApi(() => api.getBuild(id), [id]);
}

export function useBuildExport(id: string) {
  return useApi(() => api.getBuildExport(id), [id]);
}
