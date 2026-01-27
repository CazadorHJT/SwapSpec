using UnityEngine;
using UnityEngine.UI;
using SwapSpec.Services;

namespace SwapSpec.UI
{
    public class LoginScreen : MonoBehaviour
    {
        [Header("Services")]
        [SerializeField] private AuthService authService;
        [SerializeField] private ScreenManager screenManager;

        [Header("UI Elements")]
        [SerializeField] private InputField emailInput;
        [SerializeField] private InputField passwordInput;
        [SerializeField] private Button loginButton;
        [SerializeField] private Button registerButton;
        [SerializeField] private Text statusText;

        private void OnEnable()
        {
            loginButton.onClick.AddListener(OnLoginClicked);
            registerButton.onClick.AddListener(OnRegisterClicked);
            statusText.text = "";
        }

        private void OnDisable()
        {
            loginButton.onClick.RemoveListener(OnLoginClicked);
            registerButton.onClick.RemoveListener(OnRegisterClicked);
        }

        private void OnLoginClicked()
        {
            SetInteractable(false);
            statusText.text = "Logging in...";

            authService.Login(emailInput.text, passwordInput.text,
                user =>
                {
                    statusText.text = "";
                    screenManager.ShowBuildList();
                },
                error =>
                {
                    statusText.text = error;
                    SetInteractable(true);
                });
        }

        private void OnRegisterClicked()
        {
            SetInteractable(false);
            statusText.text = "Registering...";

            authService.Register(emailInput.text, passwordInput.text,
                user =>
                {
                    statusText.text = "Registered! Logging in...";
                    authService.Login(emailInput.text, passwordInput.text,
                        _ => screenManager.ShowBuildList(),
                        error =>
                        {
                            statusText.text = error;
                            SetInteractable(true);
                        });
                },
                error =>
                {
                    statusText.text = error;
                    SetInteractable(true);
                });
        }

        private void SetInteractable(bool value)
        {
            loginButton.interactable = value;
            registerButton.interactable = value;
            emailInput.interactable = value;
            passwordInput.interactable = value;
        }
    }
}
