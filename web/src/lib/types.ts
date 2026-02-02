// ── Auth ──────────────────────────────────────────────
export type AccountType = "hobbyist" | "professional";
export type SubscriptionStatus = "free" | "per_project" | "subscription";

export interface User {
  id: string;
  email: string;
  account_type: AccountType;
  subscription_status: SubscriptionStatus;
  created_at: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  account_type?: AccountType;
}

// ── Vehicles ─────────────────────────────────────────
export type QualityStatus = "pending" | "approved" | "rejected";

export interface Vehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  vin_pattern?: string;
  bay_scan_mesh_url?: string;
  contributor_id?: string;
  quality_status: QualityStatus;
  modifications?: Record<string, unknown>;
  created_at: string;
}

export interface VehicleCreate {
  year: number;
  make: string;
  model: string;
  trim?: string;
  vin_pattern?: string;
  bay_scan_mesh_url?: string;
  modifications?: Record<string, unknown>;
}

export interface VehicleList {
  vehicles: Vehicle[];
  total: number;
}

export interface VINDecodeResponse {
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  engine?: string;
  raw_data?: Record<string, unknown>;
}

// ── Engines ──────────────────────────────────────────
export interface Engine {
  id: string;
  make: string;
  model: string;
  variant?: string;
  dimensions_h?: number;
  dimensions_w?: number;
  dimensions_l?: number;
  weight?: number;
  fuel_pressure_psi?: number;
  fuel_flow_lph?: number;
  cooling_btu_min?: number;
  power_hp?: number;
  torque_lb_ft?: number;
  mesh_file_url?: string;
  mount_points?: Record<string, unknown>;
  created_at: string;
}

export interface EngineCreate {
  make: string;
  model: string;
  variant?: string;
  dimensions_h?: number;
  dimensions_w?: number;
  dimensions_l?: number;
  weight?: number;
  fuel_pressure_psi?: number;
  fuel_flow_lph?: number;
  cooling_btu_min?: number;
  power_hp?: number;
  torque_lb_ft?: number;
  mesh_file_url?: string;
  mount_points?: Record<string, unknown>;
}

export interface EngineList {
  engines: Engine[];
  total: number;
}

// ── Transmissions ────────────────────────────────────
export interface Transmission {
  id: string;
  make: string;
  model: string;
  dimensions_h?: number;
  dimensions_w?: number;
  dimensions_l?: number;
  weight?: number;
  bellhousing_pattern?: string;
  mesh_file_url?: string;
  created_at: string;
}

export interface TransmissionCreate {
  make: string;
  model: string;
  dimensions_h?: number;
  dimensions_w?: number;
  dimensions_l?: number;
  weight?: number;
  bellhousing_pattern?: string;
  mesh_file_url?: string;
}

export interface TransmissionList {
  transmissions: Transmission[];
  total: number;
}

// ── Builds ───────────────────────────────────────────
export type BuildStatus = "draft" | "complete";

export interface Build {
  id: string;
  user_id: string;
  vehicle_id: string;
  engine_id: string;
  transmission_id?: string;
  engine_position?: Record<string, unknown>;
  accessory_config?: Record<string, unknown>;
  collision_data?: Record<string, unknown>;
  status: BuildStatus;
  created_at: string;
}

export interface BuildCreate {
  vehicle_id: string;
  engine_id: string;
  transmission_id?: string;
}

export interface BuildUpdate {
  engine_position?: Record<string, unknown>;
  accessory_config?: Record<string, unknown>;
  collision_data?: Record<string, unknown>;
  status?: BuildStatus;
  transmission_id?: string;
}

export interface BuildList {
  builds: Build[];
  total: number;
}

export interface BuildExport {
  build: Build;
  vehicle: {
    id: string;
    year: number;
    make: string;
    model: string;
    trim?: string;
  };
  engine: {
    id: string;
    make: string;
    model: string;
    variant?: string;
    power_hp?: number;
    torque_lb_ft?: number;
    fuel_pressure_psi?: number;
    fuel_flow_lph?: number;
    cooling_btu_min?: number;
  };
  transmission?: {
    id: string;
    make: string;
    model: string;
    bellhousing_pattern?: string;
  } | null;
  recommendations?: string[];
}

// ── Advisor / Chat ───────────────────────────────────
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatMessageResponse {
  id: string;
  build_id: string;
  role: string;
  content: string;
  created_at: string;
}

export interface ChatHistoryResponse {
  messages: ChatMessageResponse[];
  total: number;
}

export interface AdvisorRequest {
  build_id: string;
  message: string;
}

export interface AdvisorResponse {
  response: string;
  sources?: string[];
}

// ── Files ────────────────────────────────────────────
export interface FileUploadResponse {
  filename: string;
  stored_path: string;
  url: string;
  size_bytes: number;
}
