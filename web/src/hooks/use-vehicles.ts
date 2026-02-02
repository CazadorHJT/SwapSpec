"use client";

import { useApi } from "./use-api";
import * as api from "@/lib/api-client";

export function useVehicles(params?: {
  year?: number;
  make?: string;
  model?: string;
  skip?: number;
  limit?: number;
}) {
  return useApi(
    () => api.getVehicles(params),
    [params?.year, params?.make, params?.model, params?.skip, params?.limit],
  );
}
