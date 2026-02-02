"use client";

import { useApi } from "./use-api";
import * as api from "@/lib/api-client";

export function useTransmissions(params?: {
  make?: string;
  bellhousing_pattern?: string;
  skip?: number;
  limit?: number;
}) {
  return useApi(
    () => api.getTransmissions(params),
    [params?.make, params?.bellhousing_pattern, params?.skip, params?.limit],
  );
}
