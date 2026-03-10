"use client";

import { useApi } from "./use-api";
import * as api from "@/lib/api-client";

export function useVehicles(params?: {
  year?: number;
  make?: string;
  model?: string;
  drive_type?: string;
  body_style?: string;
  skip?: number;
  limit?: number;
}) {
  return useApi(
    () => api.getVehicles(params),
    [params?.year, params?.make, params?.model, params?.drive_type, params?.body_style, params?.skip, params?.limit],
  );
}
