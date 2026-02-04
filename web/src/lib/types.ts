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

// ── Data Provenance ─────────────────────────────────
export type DataSourceType =
  | "manufacturer"
  | "carquery_api"
  | "nhtsa_api"
  | "user_contributed";

export type DataSources = Record<string, DataSourceType>;

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
  // Vehicle specs
  engine_bay_length_in?: number;
  engine_bay_width_in?: number;
  engine_bay_height_in?: number;
  firewall_to_radiator_in?: number;
  driveline_angle_deg?: number;
  transmission_tunnel_width_in?: number;
  transmission_tunnel_height_in?: number;
  curb_weight_lbs?: number;
  stock_weight_distribution_front_pct?: number;
  steering_type?: string;
  steering_clearance_notes?: string;
  stock_ground_clearance_in?: number;
  // Data provenance
  data_sources?: DataSources;
  data_source_notes?: string;
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
  engine_bay_length_in?: number;
  engine_bay_width_in?: number;
  engine_bay_height_in?: number;
  firewall_to_radiator_in?: number;
  driveline_angle_deg?: number;
  transmission_tunnel_width_in?: number;
  transmission_tunnel_height_in?: number;
  curb_weight_lbs?: number;
  stock_weight_distribution_front_pct?: number;
  steering_type?: string;
  steering_clearance_notes?: string;
  stock_ground_clearance_in?: number;
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
  // Internal specs
  displacement_liters?: number;
  compression_ratio?: number;
  valve_train?: string;
  bore_mm?: number;
  stroke_mm?: number;
  balance_type?: string;
  cam_intake_lift_in?: number;
  cam_exhaust_lift_in?: number;
  cam_intake_duration_deg?: number;
  cam_exhaust_duration_deg?: number;
  redline_rpm?: number;
  idle_rpm?: number;
  // Geometry
  oil_pan_depth_in?: number;
  oil_pan_type?: string;
  front_accessory_drive_depth_in?: number;
  // Thermal
  cooling_system_type?: string;
  thermostat_temp_f?: number;
  exhaust_port_shape?: string;
  exhaust_header_primary_od_in?: number;
  recommended_radiator_rows?: number;
  // Electronics
  can_bus_protocol?: string;
  ecu_type?: string;
  starter_position?: string;
  distributor_type?: string;
  // Data provenance
  data_sources?: DataSources;
  data_source_notes?: string;
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
  displacement_liters?: number;
  compression_ratio?: number;
  valve_train?: string;
  bore_mm?: number;
  stroke_mm?: number;
  balance_type?: string;
  cam_intake_lift_in?: number;
  cam_exhaust_lift_in?: number;
  cam_intake_duration_deg?: number;
  cam_exhaust_duration_deg?: number;
  redline_rpm?: number;
  idle_rpm?: number;
  oil_pan_depth_in?: number;
  oil_pan_type?: string;
  front_accessory_drive_depth_in?: number;
  cooling_system_type?: string;
  thermostat_temp_f?: number;
  exhaust_port_shape?: string;
  exhaust_header_primary_od_in?: number;
  recommended_radiator_rows?: number;
  can_bus_protocol?: string;
  ecu_type?: string;
  starter_position?: string;
  distributor_type?: string;
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
  // Transmission specs
  trans_type?: string;
  gear_count?: number;
  gear_ratios?: Record<string, number>;
  input_shaft_spline?: string;
  output_shaft_spline?: string;
  max_torque_capacity_lb_ft?: number;
  shift_linkage_type?: string;
  crossmember_drop_in?: number;
  tailhousing_length_in?: number;
  speedometer_drive?: string;
  // Data provenance
  data_sources?: DataSources;
  data_source_notes?: string;
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
  trans_type?: string;
  gear_count?: number;
  gear_ratios?: Record<string, number>;
  input_shaft_spline?: string;
  output_shaft_spline?: string;
  max_torque_capacity_lb_ft?: number;
  shift_linkage_type?: string;
  crossmember_drop_in?: number;
  tailhousing_length_in?: number;
  speedometer_drive?: string;
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
  vehicle: Record<string, unknown>;
  engine: Record<string, unknown>;
  transmission?: Record<string, unknown> | null;
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

// ── Spec Lookup ──────────────────────────────────────
export interface SpecLookupResponse {
  specs: Record<string, unknown>;
  sources: Record<string, string>;
  confidence: "high" | "medium" | "low";
}
