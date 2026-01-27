using System;
using UnityEngine;
using SwapSpec.Models;

namespace SwapSpec.Services
{
    public class AdvisorService : MonoBehaviour
    {
        [SerializeField] private ApiClient apiClient;

        public void SendMessage(string buildId, string message, Action<AdvisorResponse> onSuccess, Action<string> onError)
        {
            var body = new AdvisorRequest
            {
                build_id = buildId,
                message = message
            };
            apiClient.Post<AdvisorResponse>("/api/advisor/chat", body, onSuccess, onError);
        }

        public void GetChatHistory(string buildId, Action<ChatHistoryResponse> onSuccess, Action<string> onError)
        {
            apiClient.Get<ChatHistoryResponse>($"/api/advisor/chat/{buildId}/history", onSuccess, onError);
        }

        public void ClearChatHistory(string buildId, Action onSuccess, Action<string> onError)
        {
            apiClient.Delete($"/api/advisor/chat/{buildId}/history", onSuccess, onError);
        }
    }
}
