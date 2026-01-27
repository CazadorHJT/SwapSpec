using System;
using UnityEngine;
using SwapSpec.Models;

namespace SwapSpec.Services
{
    public class FileService : MonoBehaviour
    {
        [SerializeField] private ApiClient apiClient;

        public void UploadFile(byte[] fileData, string fileName, Action<FileUploadResponse> onSuccess, Action<string> onError)
        {
            apiClient.UploadFile("/api/files/upload", fileData, fileName, onSuccess, onError);
        }

        public void UploadMesh(byte[] fileData, string fileName, Action<FileUploadResponse> onSuccess, Action<string> onError)
        {
            apiClient.UploadFile("/api/files/upload/mesh", fileData, fileName, onSuccess, onError);
        }

        public void DeleteFile(string path, Action onSuccess, Action<string> onError)
        {
            apiClient.Delete($"/api/files/{path}", onSuccess, onError);
        }
    }
}
