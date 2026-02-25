import { useApi } from "./use-api";
import * as api from "@/lib/api-client";

export function useBuilds() {
  return useApi(() => api.getBuilds({ limit: 50 }), []);
}

export function useBuild(id: string) {
  return useApi(() => api.getBuild(id), [id]);
}

export function useBuildExport(id: string) {
  return useApi(() => api.getBuildExport(id), [id]);
}
