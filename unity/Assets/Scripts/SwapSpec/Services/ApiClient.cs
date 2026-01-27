using System;
using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;
using SwapSpec.Models;

namespace SwapSpec.Services
{
    public class ApiClient : MonoBehaviour
    {
        [SerializeField] private string baseUrl = "http://localhost:8000";

        private string _authToken;

        public string BaseUrl => baseUrl;

        public void SetAuthToken(string token)
        {
            _authToken = token;
        }

        public void ClearAuthToken()
        {
            _authToken = null;
        }

        public bool HasAuthToken => !string.IsNullOrEmpty(_authToken);

        // ── GET ──────────────────────────────────────────

        public Coroutine Get<T>(string endpoint, Action<T> onSuccess, Action<string> onError)
        {
            return StartCoroutine(SendRequest<T>("GET", endpoint, null, onSuccess, onError));
        }

        // ── POST (JSON body) ─────────────────────────────

        public Coroutine Post<T>(string endpoint, object body, Action<T> onSuccess, Action<string> onError)
        {
            string json = body != null ? JsonUtility.ToJson(body) : null;
            return StartCoroutine(SendRequest<T>("POST", endpoint, json, onSuccess, onError));
        }

        // ── POST (form-encoded, for login) ───────────────

        public Coroutine PostForm<T>(string endpoint, WWWForm form, Action<T> onSuccess, Action<string> onError)
        {
            return StartCoroutine(SendFormRequest<T>(endpoint, form, onSuccess, onError));
        }

        // ── PUT ──────────────────────────────────────────

        public Coroutine Put<T>(string endpoint, object body, Action<T> onSuccess, Action<string> onError)
        {
            string json = body != null ? JsonUtility.ToJson(body) : null;
            return StartCoroutine(SendRequest<T>("PUT", endpoint, json, onSuccess, onError));
        }

        // ── DELETE ───────────────────────────────────────

        public Coroutine Delete(string endpoint, Action onSuccess, Action<string> onError)
        {
            return StartCoroutine(SendDeleteRequest(endpoint, onSuccess, onError));
        }

        // ── Upload file via multipart form ───────────────

        public Coroutine UploadFile(string endpoint, byte[] fileData, string fileName, Action<FileUploadResponse> onSuccess, Action<string> onError)
        {
            return StartCoroutine(SendUploadRequest(endpoint, fileData, fileName, onSuccess, onError));
        }

        // ── Download raw bytes (for PDF) ─────────────────

        public Coroutine DownloadBytes(string endpoint, Action<byte[]> onSuccess, Action<string> onError)
        {
            return StartCoroutine(SendDownloadRequest(endpoint, onSuccess, onError));
        }

        // ── Internal request methods ─────────────────────

        private IEnumerator SendRequest<T>(string method, string endpoint, string jsonBody, Action<T> onSuccess, Action<string> onError)
        {
            string url = baseUrl + endpoint;
            UnityWebRequest request;

            if (method == "GET")
            {
                request = UnityWebRequest.Get(url);
            }
            else
            {
                byte[] bodyRaw = jsonBody != null ? Encoding.UTF8.GetBytes(jsonBody) : null;
                request = new UnityWebRequest(url, method);
                if (bodyRaw != null)
                {
                    request.uploadHandler = new UploadHandlerRaw(bodyRaw);
                }
                request.downloadHandler = new DownloadHandlerBuffer();
                request.SetRequestHeader("Content-Type", "application/json");
            }

            AttachAuth(request);
            yield return request.SendWebRequest();

            HandleResponse(request, onSuccess, onError);
            request.Dispose();
        }

        private IEnumerator SendFormRequest<T>(string endpoint, WWWForm form, Action<T> onSuccess, Action<string> onError)
        {
            string url = baseUrl + endpoint;
            UnityWebRequest request = UnityWebRequest.Post(url, form);
            AttachAuth(request);

            yield return request.SendWebRequest();
            HandleResponse(request, onSuccess, onError);
            request.Dispose();
        }

        private IEnumerator SendDeleteRequest(string endpoint, Action onSuccess, Action<string> onError)
        {
            string url = baseUrl + endpoint;
            UnityWebRequest request = UnityWebRequest.Delete(url);
            request.downloadHandler = new DownloadHandlerBuffer();
            AttachAuth(request);

            yield return request.SendWebRequest();

            if (request.result != UnityWebRequest.Result.Success)
            {
                onError?.Invoke(ParseError(request));
            }
            else
            {
                onSuccess?.Invoke();
            }
            request.Dispose();
        }

        private IEnumerator SendUploadRequest(string endpoint, byte[] fileData, string fileName, Action<FileUploadResponse> onSuccess, Action<string> onError)
        {
            string url = baseUrl + endpoint;
            var form = new System.Collections.Generic.List<IMultipartFormSection>
            {
                new MultipartFormFileSection("file", fileData, fileName, "application/octet-stream")
            };

            UnityWebRequest request = UnityWebRequest.Post(url, form);
            AttachAuth(request);

            yield return request.SendWebRequest();
            HandleResponse(request, onSuccess, onError);
            request.Dispose();
        }

        private IEnumerator SendDownloadRequest(string endpoint, Action<byte[]> onSuccess, Action<string> onError)
        {
            string url = baseUrl + endpoint;
            UnityWebRequest request = UnityWebRequest.Get(url);
            AttachAuth(request);

            yield return request.SendWebRequest();

            if (request.result != UnityWebRequest.Result.Success)
            {
                onError?.Invoke(ParseError(request));
            }
            else
            {
                onSuccess?.Invoke(request.downloadHandler.data);
            }
            request.Dispose();
        }

        // ── Helpers ──────────────────────────────────────

        private void AttachAuth(UnityWebRequest request)
        {
            if (!string.IsNullOrEmpty(_authToken))
            {
                request.SetRequestHeader("Authorization", "Bearer " + _authToken);
            }
        }

        private void HandleResponse<T>(UnityWebRequest request, Action<T> onSuccess, Action<string> onError)
        {
            if (request.result != UnityWebRequest.Result.Success)
            {
                onError?.Invoke(ParseError(request));
            }
            else
            {
                try
                {
                    T result = JsonUtility.FromJson<T>(request.downloadHandler.text);
                    onSuccess?.Invoke(result);
                }
                catch (Exception e)
                {
                    onError?.Invoke("JSON parse error: " + e.Message);
                }
            }
        }

        private string ParseError(UnityWebRequest request)
        {
            if (request.downloadHandler != null && !string.IsNullOrEmpty(request.downloadHandler.text))
            {
                try
                {
                    ApiError err = JsonUtility.FromJson<ApiError>(request.downloadHandler.text);
                    if (!string.IsNullOrEmpty(err.detail))
                        return err.detail;
                }
                catch { }
            }
            return request.error ?? "Unknown error (HTTP " + request.responseCode + ")";
        }
    }
}
