using System;
using UnityEngine;
using SwapSpec.Models;

namespace SwapSpec.Services
{
    public class EngineService : MonoBehaviour
    {
        [SerializeField] private ApiClient apiClient;

        public void GetEngines(Action<EngineList> onSuccess, Action<string> onError,
            string make = null, int? minHp = null, int? maxHp = null, int skip = 0, int limit = 50)
        {
            string query = $"?skip={skip}&limit={limit}";
            if (!string.IsNullOrEmpty(make)) query += $"&make={Uri.EscapeDataString(make)}";
            if (minHp.HasValue) query += $"&min_hp={minHp.Value}";
            if (maxHp.HasValue) query += $"&max_hp={maxHp.Value}";

            apiClient.Get<EngineList>("/api/engines" + query, onSuccess, onError);
        }

        public void GetEngine(string engineId, Action<EngineResponse> onSuccess, Action<string> onError)
        {
            apiClient.Get<EngineResponse>($"/api/engines/{engineId}", onSuccess, onError);
        }

        public void CreateEngine(EngineCreate engine, Action<EngineResponse> onSuccess, Action<string> onError)
        {
            apiClient.Post<EngineResponse>("/api/engines", engine, onSuccess, onError);
        }
    }
}
