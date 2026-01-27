using System;
using UnityEngine;
using SwapSpec.Models;

namespace SwapSpec.Services
{
    public class VehicleService : MonoBehaviour
    {
        [SerializeField] private ApiClient apiClient;

        public void GetVehicles(Action<VehicleList> onSuccess, Action<string> onError,
            int? year = null, string make = null, string model = null, int skip = 0, int limit = 50)
        {
            string query = $"?skip={skip}&limit={limit}";
            if (year.HasValue) query += $"&year={year.Value}";
            if (!string.IsNullOrEmpty(make)) query += $"&make={Uri.EscapeDataString(make)}";
            if (!string.IsNullOrEmpty(model)) query += $"&model={Uri.EscapeDataString(model)}";

            apiClient.Get<VehicleList>("/api/vehicles" + query, onSuccess, onError);
        }

        public void GetVehicle(string vehicleId, Action<VehicleResponse> onSuccess, Action<string> onError)
        {
            apiClient.Get<VehicleResponse>($"/api/vehicles/{vehicleId}", onSuccess, onError);
        }

        public void CreateVehicle(VehicleCreate vehicle, Action<VehicleResponse> onSuccess, Action<string> onError)
        {
            apiClient.Post<VehicleResponse>("/api/vehicles", vehicle, onSuccess, onError);
        }

        public void DecodeVIN(string vin, Action<VINDecodeResponse> onSuccess, Action<string> onError)
        {
            apiClient.Get<VINDecodeResponse>($"/api/vehicles/decode-vin/{Uri.EscapeDataString(vin)}", onSuccess, onError);
        }
    }
}
