import { useApi } from "./use-api";
import * as api from "@/lib/api-client";

export function useCompatibleTransmissions(engineId: string) {
  return useApi(
    () => (engineId ? api.getCompatibleTransmissions(engineId) : Promise.resolve({ transmissions: [], total: 0 })),
    [engineId],
  );
}
