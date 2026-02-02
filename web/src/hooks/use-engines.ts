"use client";

import { useApi } from "./use-api";
import * as api from "@/lib/api-client";

export function useEngines(params?: {
  make?: string;
  min_hp?: number;
  max_hp?: number;
  skip?: number;
  limit?: number;
}) {
  return useApi(
    () => api.getEngines(params),
    [params?.make, params?.min_hp, params?.max_hp, params?.skip, params?.limit],
  );
}
