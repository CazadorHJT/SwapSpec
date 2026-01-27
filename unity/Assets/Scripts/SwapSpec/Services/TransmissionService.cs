using System;
using UnityEngine;
using SwapSpec.Models;

namespace SwapSpec.Services
{
    public class TransmissionService : MonoBehaviour
    {
        [SerializeField] private ApiClient apiClient;

        public void GetTransmissions(Action<TransmissionList> onSuccess, Action<string> onError,
            string make = null, string bellhousingPattern = null, int skip = 0, int limit = 50)
        {
            string query = $"?skip={skip}&limit={limit}";
            if (!string.IsNullOrEmpty(make)) query += $"&make={Uri.EscapeDataString(make)}";
            if (!string.IsNullOrEmpty(bellhousingPattern)) query += $"&bellhousing_pattern={Uri.EscapeDataString(bellhousingPattern)}";

            apiClient.Get<TransmissionList>("/api/transmissions" + query, onSuccess, onError);
        }

        public void GetTransmission(string transmissionId, Action<TransmissionResponse> onSuccess, Action<string> onError)
        {
            apiClient.Get<TransmissionResponse>($"/api/transmissions/{transmissionId}", onSuccess, onError);
        }

        public void GetCompatible(string engineId, Action<TransmissionList> onSuccess, Action<string> onError)
        {
            apiClient.Get<TransmissionList>($"/api/transmissions/compatible/{engineId}", onSuccess, onError);
        }

        public void CreateTransmission(TransmissionCreate transmission, Action<TransmissionResponse> onSuccess, Action<string> onError)
        {
            apiClient.Post<TransmissionResponse>("/api/transmissions", transmission, onSuccess, onError);
        }
    }
}
