using System;

namespace SwapSpec.Models
{
    // ── Auth ─────────────────────────────────────────────

    [Serializable]
    public class LoginRequest
    {
        public string username;
        public string password;
    }

    [Serializable]
    public class RegisterRequest
    {
        public string email;
        public string password;
        public string account_type;
    }

    [Serializable]
    public class Token
    {
        public string access_token;
        public string token_type;
    }

    [Serializable]
    public class UserResponse
    {
        public string id;
        public string email;
        public string account_type;
        public string subscription_status;
        public string created_at;
    }

    // ── Vehicles ─────────────────────────────────────────

    [Serializable]
    public class VehicleResponse
    {
        public string id;
        public int year;
        public string make;
        public string model;
        public string trim;
        public string vin_pattern;
        public string bay_scan_mesh_url;
        public string contributor_id;
        public string quality_status;
        public string created_at;
    }

    [Serializable]
    public class VehicleList
    {
        public VehicleResponse[] vehicles;
        public int total;
    }

    [Serializable]
    public class VehicleCreate
    {
        public int year;
        public string make;
        public string model;
        public string trim;
        public string vin_pattern;
        public string bay_scan_mesh_url;
    }

    [Serializable]
    public class VINDecodeResponse
    {
        public int year;
        public string make;
        public string model;
        public string trim;
        public string engine;
    }

    // ── Engines ──────────────────────────────────────────

    [Serializable]
    public class EngineResponse
    {
        public string id;
        public string make;
        public string model;
        public string variant;
        public float dimensions_h;
        public float dimensions_w;
        public float dimensions_l;
        public float weight;
        public float fuel_pressure_psi;
        public float fuel_flow_lph;
        public float cooling_btu_min;
        public int power_hp;
        public int torque_lb_ft;
        public string mesh_file_url;
        public string created_at;
    }

    [Serializable]
    public class EngineList
    {
        public EngineResponse[] engines;
        public int total;
    }

    [Serializable]
    public class EngineCreate
    {
        public string make;
        public string model;
        public string variant;
        public float dimensions_h;
        public float dimensions_w;
        public float dimensions_l;
        public float weight;
        public float fuel_pressure_psi;
        public float fuel_flow_lph;
        public float cooling_btu_min;
        public int power_hp;
        public int torque_lb_ft;
        public string mesh_file_url;
    }

    // ── Transmissions ────────────────────────────────────

    [Serializable]
    public class TransmissionResponse
    {
        public string id;
        public string make;
        public string model;
        public float dimensions_h;
        public float dimensions_w;
        public float dimensions_l;
        public float weight;
        public string bellhousing_pattern;
        public string mesh_file_url;
        public string created_at;
    }

    [Serializable]
    public class TransmissionList
    {
        public TransmissionResponse[] transmissions;
        public int total;
    }

    [Serializable]
    public class TransmissionCreate
    {
        public string make;
        public string model;
        public float dimensions_h;
        public float dimensions_w;
        public float dimensions_l;
        public float weight;
        public string bellhousing_pattern;
        public string mesh_file_url;
    }

    // ── Builds ───────────────────────────────────────────

    [Serializable]
    public class BuildResponse
    {
        public string id;
        public string user_id;
        public string vehicle_id;
        public string engine_id;
        public string transmission_id;
        public string status;
        public string created_at;
    }

    [Serializable]
    public class BuildList
    {
        public BuildResponse[] builds;
        public int total;
    }

    [Serializable]
    public class BuildCreate
    {
        public string vehicle_id;
        public string engine_id;
        public string transmission_id;
    }

    [Serializable]
    public class BuildUpdate
    {
        public string status;
        public string transmission_id;
    }

    [Serializable]
    public class BuildExportVehicle
    {
        public string id;
        public int year;
        public string make;
        public string model;
        public string trim;
    }

    [Serializable]
    public class BuildExportEngine
    {
        public string id;
        public string make;
        public string model;
        public string variant;
        public int power_hp;
        public int torque_lb_ft;
        public float fuel_pressure_psi;
        public float fuel_flow_lph;
        public float cooling_btu_min;
    }

    [Serializable]
    public class BuildExportTransmission
    {
        public string id;
        public string make;
        public string model;
        public string bellhousing_pattern;
    }

    [Serializable]
    public class BuildExport
    {
        public BuildResponse build;
        public BuildExportVehicle vehicle;
        public BuildExportEngine engine;
        public BuildExportTransmission transmission;
        public string[] recommendations;
    }

    // ── Advisor ──────────────────────────────────────────

    [Serializable]
    public class AdvisorRequest
    {
        public string build_id;
        public string message;
    }

    [Serializable]
    public class AdvisorResponse
    {
        public string response;
        public string[] sources;
    }

    [Serializable]
    public class ChatMessageResponse
    {
        public string id;
        public string build_id;
        public string role;
        public string content;
        public string created_at;
    }

    [Serializable]
    public class ChatHistoryResponse
    {
        public ChatMessageResponse[] messages;
        public int total;
    }

    // ── Files ────────────────────────────────────────────

    [Serializable]
    public class FileUploadResponse
    {
        public string filename;
        public string stored_path;
        public string url;
        public int size_bytes;
    }

    // ── Errors ───────────────────────────────────────────

    [Serializable]
    public class ApiError
    {
        public string detail;
    }
}
