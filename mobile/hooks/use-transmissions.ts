import { useApi } from "./use-api";
import * as api from "@/lib/api-client";

export function useTransmissions(params?: { make?: string; bellhousing_pattern?: string }) {
  return useApi(
    () => api.getTransmissions({ ...params, limit: 50 }),
    [params?.make, params?.bellhousing_pattern],
  );
}

export function useTransmission(id: string) {
  return useApi(() => api.getTransmission(id), [id]);
}
