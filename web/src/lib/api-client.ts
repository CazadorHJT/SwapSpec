import type {
  Token,
  User,
  LoginRequest,
  RegisterRequest,
  VehicleList,
  Vehicle,
  VehicleCreate,
  VINDecodeResponse,
  EngineList,
  Engine,
  EngineCreate,
  EngineFamily,
  EngineIdentifyResponse,
  TransmissionList,
  Transmission,
  TransmissionCreate,
  TransmissionGroups,
  TransmissionIdentifyResponse,
  BuildList,
  Build,
  BuildCreate,
  BuildUpdate,
  BuildExport,
  AdvisorRequest,
  AdvisorResponse,
  ChatHistoryResponse,
  FileUploadResponse,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("swapspec_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Only set Content-Type for non-FormData bodies
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    localStorage.removeItem("swapspec_token");
    window.location.href = "/login";
    throw new ApiError(401, "Unauthorized");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, body.detail ?? "Request failed");
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json();
}

// ── Auth ──────────────────────────────────────────────

export async function login(data: LoginRequest): Promise<Token> {
  return request<Token>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function register(data: RegisterRequest): Promise<User> {
  return request<User>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getMe(): Promise<User> {
  return request<User>("/api/auth/me");
}

// ── Vehicles ─────────────────────────────────────────

export async function getVehicles(params?: {
  year?: number;
  make?: string;
  model?: string;
  drive_type?: string;
  body_style?: string;
  skip?: number;
  limit?: number;
}): Promise<VehicleList> {
  const sp = new URLSearchParams();
  if (params?.year) sp.set("year", String(params.year));
  if (params?.make) sp.set("make", params.make);
  if (params?.model) sp.set("model", params.model);
  if (params?.drive_type) sp.set("drive_type", params.drive_type);
  if (params?.body_style) sp.set("body_style", params.body_style);
  if (params?.skip) sp.set("skip", String(params.skip));
  if (params?.limit) sp.set("limit", String(params.limit));
  const qs = sp.toString();
  return request<VehicleList>(`/api/vehicles${qs ? `?${qs}` : ""}`);
}

export async function getVehicle(id: string): Promise<Vehicle> {
  return request<Vehicle>(`/api/vehicles/${id}`);
}

export async function createVehicle(data: VehicleCreate): Promise<Vehicle> {
  return request<Vehicle>("/api/vehicles", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function decodeVin(vin: string): Promise<VINDecodeResponse> {
  return request<VINDecodeResponse>(`/api/vehicles/decode-vin/${vin}`);
}

// ── Engines ──────────────────────────────────────────

export async function getEngines(params?: {
  make?: string;
  min_hp?: number;
  max_hp?: number;
  skip?: number;
  limit?: number;
}): Promise<EngineList> {
  const sp = new URLSearchParams();
  if (params?.make) sp.set("make", params.make);
  if (params?.min_hp) sp.set("min_hp", String(params.min_hp));
  if (params?.max_hp) sp.set("max_hp", String(params.max_hp));
  if (params?.skip) sp.set("skip", String(params.skip));
  if (params?.limit) sp.set("limit", String(params.limit));
  const qs = sp.toString();
  return request<EngineList>(`/api/engines${qs ? `?${qs}` : ""}`);
}

export async function getEngine(id: string): Promise<Engine> {
  return request<Engine>(`/api/engines/${id}`);
}

export async function createEngine(data: EngineCreate): Promise<Engine> {
  return request<Engine>("/api/engines", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getEngineFamilies(
  make?: string,
): Promise<EngineFamily[]> {
  const sp = new URLSearchParams();
  if (make) sp.set("make", make);
  const qs = sp.toString();
  return request<EngineFamily[]>(`/api/engines/families${qs ? `?${qs}` : ""}`);
}

export async function identifyEngine(
  query: string,
): Promise<EngineIdentifyResponse> {
  return request<EngineIdentifyResponse>("/api/engines/identify", {
    method: "POST",
    body: JSON.stringify({ query }),
  });
}

// ── Transmissions ────────────────────────────────────

export async function getTransmissions(params?: {
  make?: string;
  bellhousing_pattern?: string;
  skip?: number;
  limit?: number;
}): Promise<TransmissionList> {
  const sp = new URLSearchParams();
  if (params?.make) sp.set("make", params.make);
  if (params?.bellhousing_pattern)
    sp.set("bellhousing_pattern", params.bellhousing_pattern);
  if (params?.skip) sp.set("skip", String(params.skip));
  if (params?.limit) sp.set("limit", String(params.limit));
  const qs = sp.toString();
  return request<TransmissionList>(`/api/transmissions${qs ? `?${qs}` : ""}`);
}

export async function getTransmission(id: string): Promise<Transmission> {
  return request<Transmission>(`/api/transmissions/${id}`);
}

export async function getCompatibleTransmissions(
  engineId: string,
): Promise<TransmissionList> {
  return request<TransmissionList>(`/api/transmissions/compatible/${engineId}`);
}

export async function createTransmission(
  data: TransmissionCreate,
): Promise<Transmission> {
  return request<Transmission>("/api/transmissions", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getTransmissionsForBuild(
  engineId: string,
  vehicleId?: string,
): Promise<TransmissionGroups> {
  const sp = new URLSearchParams({ engine_id: engineId });
  if (vehicleId) sp.set("vehicle_id", vehicleId);
  return request<TransmissionGroups>(
    `/api/transmissions/for-build?${sp.toString()}`,
  );
}

export async function identifyTransmission(
  query: string,
): Promise<TransmissionIdentifyResponse> {
  return request<TransmissionIdentifyResponse>("/api/transmissions/identify", {
    method: "POST",
    body: JSON.stringify({ query }),
  });
}

// ── Builds ───────────────────────────────────────────

export async function getBuilds(params?: {
  skip?: number;
  limit?: number;
}): Promise<BuildList> {
  const sp = new URLSearchParams();
  if (params?.skip) sp.set("skip", String(params.skip));
  if (params?.limit) sp.set("limit", String(params.limit));
  const qs = sp.toString();
  return request<BuildList>(`/api/builds${qs ? `?${qs}` : ""}`);
}

export async function getBuild(id: string): Promise<Build> {
  return request<Build>(`/api/builds/${id}`);
}

export async function createBuild(data: BuildCreate): Promise<Build> {
  return request<Build>("/api/builds", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateBuild(
  id: string,
  data: BuildUpdate,
): Promise<Build> {
  return request<Build>(`/api/builds/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function getBuildExport(id: string): Promise<BuildExport> {
  return request<BuildExport>(`/api/builds/${id}/export`);
}

export async function downloadBuildPdf(id: string): Promise<Blob> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/api/builds/${id}/export/pdf`, {
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, body.detail ?? "PDF export failed");
  }

  return res.blob();
}

// ── Advisor ──────────────────────────────────────────

export async function sendAdvisorMessage(
  data: AdvisorRequest,
): Promise<AdvisorResponse> {
  return request<AdvisorResponse>("/api/advisor/chat", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getChatHistory(
  buildId: string,
): Promise<ChatHistoryResponse> {
  return request<ChatHistoryResponse>(`/api/advisor/chat/${buildId}/history`);
}

export async function clearChatHistory(buildId: string): Promise<void> {
  return request<void>(`/api/advisor/chat/${buildId}/history`, {
    method: "DELETE",
  });
}

// ── Files ────────────────────────────────────────────

export async function uploadFile(file: File): Promise<FileUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  return request<FileUploadResponse>("/api/files/upload", {
    method: "POST",
    body: formData,
  });
}

export async function uploadMesh(file: File): Promise<FileUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  return request<FileUploadResponse>("/api/files/upload/mesh", {
    method: "POST",
    body: formData,
  });
}

export async function deleteFile(path: string): Promise<void> {
  return request<void>(`/api/files/${path}`, { method: "DELETE" });
}

export { ApiError };
