using System;
using UnityEngine;
using SwapSpec.Models;

namespace SwapSpec.Services
{
    public class AuthService : MonoBehaviour
    {
        [SerializeField] private ApiClient apiClient;

        private const string TokenKey = "swapspec_auth_token";

        public UserResponse CurrentUser { get; private set; }
        public bool IsLoggedIn => apiClient != null && apiClient.HasAuthToken;

        private void Start()
        {
            string saved = PlayerPrefs.GetString(TokenKey, "");
            if (!string.IsNullOrEmpty(saved))
            {
                apiClient.SetAuthToken(saved);
            }
        }

        public void Register(string email, string password, Action<UserResponse> onSuccess, Action<string> onError)
        {
            var body = new RegisterRequest
            {
                email = email,
                password = password,
                account_type = "hobbyist"
            };
            apiClient.Post<UserResponse>("/api/auth/register", body, onSuccess, onError);
        }

        public void Login(string email, string password, Action<UserResponse> onSuccess, Action<string> onError)
        {
            var form = new WWWForm();
            form.AddField("username", email);
            form.AddField("password", password);

            apiClient.PostForm<Token>("/api/auth/login", form,
                token =>
                {
                    apiClient.SetAuthToken(token.access_token);
                    PlayerPrefs.SetString(TokenKey, token.access_token);
                    PlayerPrefs.Save();
                    FetchCurrentUser(onSuccess, onError);
                },
                onError);
        }

        public void FetchCurrentUser(Action<UserResponse> onSuccess, Action<string> onError)
        {
            apiClient.Get<UserResponse>("/api/auth/me",
                user =>
                {
                    CurrentUser = user;
                    onSuccess?.Invoke(user);
                },
                onError);
        }

        public void Logout()
        {
            apiClient.ClearAuthToken();
            CurrentUser = null;
            PlayerPrefs.DeleteKey(TokenKey);
            PlayerPrefs.Save();
        }

        public bool TryRestoreSession(Action<UserResponse> onSuccess, Action<string> onError)
        {
            if (!apiClient.HasAuthToken) return false;
            FetchCurrentUser(onSuccess, onError);
            return true;
        }
    }
}
