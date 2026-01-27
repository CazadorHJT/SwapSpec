using System;
using System.IO;
using UnityEngine;
using SwapSpec.Models;

namespace SwapSpec.Services
{
    public class BuildService : MonoBehaviour
    {
        [SerializeField] private ApiClient apiClient;

        public void GetBuilds(Action<BuildList> onSuccess, Action<string> onError, int skip = 0, int limit = 50)
        {
            apiClient.Get<BuildList>($"/api/builds?skip={skip}&limit={limit}", onSuccess, onError);
        }

        public void GetBuild(string buildId, Action<BuildResponse> onSuccess, Action<string> onError)
        {
            apiClient.Get<BuildResponse>($"/api/builds/{buildId}", onSuccess, onError);
        }

        public void CreateBuild(BuildCreate build, Action<BuildResponse> onSuccess, Action<string> onError)
        {
            apiClient.Post<BuildResponse>("/api/builds", build, onSuccess, onError);
        }

        public void UpdateBuild(string buildId, BuildUpdate update, Action<BuildResponse> onSuccess, Action<string> onError)
        {
            apiClient.Put<BuildResponse>($"/api/builds/{buildId}", update, onSuccess, onError);
        }

        public void ExportBuild(string buildId, Action<BuildExport> onSuccess, Action<string> onError)
        {
            apiClient.Get<BuildExport>($"/api/builds/{buildId}/export", onSuccess, onError);
        }

        public void ExportBuildPDF(string buildId, Action<byte[]> onSuccess, Action<string> onError)
        {
            apiClient.DownloadBytes($"/api/builds/{buildId}/export/pdf", onSuccess, onError);
        }

        public void SavePDFToFile(byte[] pdfData, string buildId)
        {
            string path = Path.Combine(Application.persistentDataPath, $"build_{buildId}.pdf");
            File.WriteAllBytes(path, pdfData);
            Debug.Log("PDF saved to: " + path);
        }
    }
}
