using UnityEngine;

namespace SwapSpec.UI
{
    public class ScreenManager : MonoBehaviour
    {
        [SerializeField] private GameObject loginScreen;
        [SerializeField] private GameObject buildListScreen;
        [SerializeField] private GameObject vehicleBrowserScreen;
        [SerializeField] private GameObject engineBrowserScreen;
        [SerializeField] private GameObject transmissionBrowserScreen;
        [SerializeField] private GameObject buildDetailScreen;
        [SerializeField] private GameObject advisorChatScreen;

        private GameObject _currentScreen;

        private void Awake()
        {
            HideAll();
        }

        public void ShowLogin() => SwitchTo(loginScreen);
        public void ShowBuildList() => SwitchTo(buildListScreen);
        public void ShowVehicleBrowser() => SwitchTo(vehicleBrowserScreen);
        public void ShowEngineBrowser() => SwitchTo(engineBrowserScreen);
        public void ShowTransmissionBrowser() => SwitchTo(transmissionBrowserScreen);
        public void ShowBuildDetail() => SwitchTo(buildDetailScreen);
        public void ShowAdvisorChat() => SwitchTo(advisorChatScreen);

        private void SwitchTo(GameObject screen)
        {
            if (_currentScreen != null)
                _currentScreen.SetActive(false);

            _currentScreen = screen;

            if (_currentScreen != null)
                _currentScreen.SetActive(true);
        }

        private void HideAll()
        {
            GameObject[] screens = {
                loginScreen, buildListScreen, vehicleBrowserScreen,
                engineBrowserScreen, transmissionBrowserScreen,
                buildDetailScreen, advisorChatScreen
            };
            foreach (var s in screens)
            {
                if (s != null) s.SetActive(false);
            }
        }
    }
}
