import { useApi } from "./use-api";
import * as api from "@/lib/api-client";

export function useEngines(params?: { make?: string; min_hp?: number; max_hp?: number }) {
  return useApi(
    () => api.getEngines({ ...params, limit: 50 }),
    [params?.make, params?.min_hp, params?.max_hp],
  );
}

export function useEngine(id: string) {
  return useApi(() => api.getEngine(id), [id]);
}
