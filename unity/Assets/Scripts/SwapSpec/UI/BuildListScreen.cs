using UnityEngine;
using UnityEngine.UI;
using SwapSpec.Models;
using SwapSpec.Services;

namespace SwapSpec.UI
{
    public class BuildListScreen : MonoBehaviour
    {
        [Header("Services")]
        [SerializeField] private BuildService buildService;
        [SerializeField] private ScreenManager screenManager;

        [Header("UI Elements")]
        [SerializeField] private Transform listContent;
        [SerializeField] private GameObject buildItemPrefab;
        [SerializeField] private Button newBuildButton;
        [SerializeField] private Button logoutButton;
        [SerializeField] private Text statusText;

        private string _selectedBuildId;

        public string SelectedBuildId => _selectedBuildId;

        private void OnEnable()
        {
            newBuildButton.onClick.AddListener(OnNewBuild);
            if (logoutButton != null)
                logoutButton.onClick.AddListener(OnLogout);
            RefreshList();
        }

        private void OnDisable()
        {
            newBuildButton.onClick.RemoveListener(OnNewBuild);
            if (logoutButton != null)
                logoutButton.onClick.RemoveListener(OnLogout);
        }

        public void RefreshList()
        {
            statusText.text = "Loading builds...";
            ClearList();

            buildService.GetBuilds(
                list =>
                {
                    statusText.text = list.total == 0 ? "No builds yet. Create one!" : "";
                    foreach (var build in list.builds)
                    {
                        AddBuildItem(build);
                    }
                },
                error => statusText.text = error);
        }

        private void AddBuildItem(BuildResponse build)
        {
            if (buildItemPrefab == null || listContent == null) return;

            GameObject item = Instantiate(buildItemPrefab, listContent);
            Text label = item.GetComponentInChildren<Text>();
            if (label != null)
                label.text = $"Build {build.id.Substring(0, 8)}... ({build.status})";

            Button btn = item.GetComponent<Button>();
            if (btn != null)
            {
                string id = build.id;
                btn.onClick.AddListener(() => OnBuildSelected(id));
            }
        }

        private void OnBuildSelected(string buildId)
        {
            _selectedBuildId = buildId;
            screenManager.ShowBuildDetail();
        }

        private void OnNewBuild()
        {
            screenManager.ShowVehicleBrowser();
        }

        private void OnLogout()
        {
            var auth = FindObjectOfType<AuthService>();
            if (auth != null) auth.Logout();
            screenManager.ShowLogin();
        }

        private void ClearList()
        {
            if (listContent == null) return;
            foreach (Transform child in listContent)
            {
                Destroy(child.gameObject);
            }
        }
    }
}
