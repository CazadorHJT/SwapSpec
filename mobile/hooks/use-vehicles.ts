import { useApi } from "./use-api";
import * as api from "@/lib/api-client";

export function useVehicles(params?: { year?: number; make?: string; model?: string }) {
  return useApi(
    () => api.getVehicles({ ...params, limit: 50 }),
    [params?.year, params?.make, params?.model],
  );
}

export function useVehicle(id: string) {
  return useApi(() => api.getVehicle(id), [id]);
}
