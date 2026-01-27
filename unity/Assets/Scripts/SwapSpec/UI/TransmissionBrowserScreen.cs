using UnityEngine;
using UnityEngine.UI;
using SwapSpec.Models;
using SwapSpec.Services;

namespace SwapSpec.UI
{
    public class TransmissionBrowserScreen : MonoBehaviour
    {
        [Header("Services")]
        [SerializeField] private TransmissionService transmissionService;
        [SerializeField] private BuildService buildService;
        [SerializeField] private ScreenManager screenManager;

        [Header("Linked Screens")]
        [SerializeField] private VehicleBrowserScreen vehicleBrowser;
        [SerializeField] private EngineBrowserScreen engineBrowser;

        [Header("UI Elements")]
        [SerializeField] private Button backButton;
        [SerializeField] private Button skipButton;
        [SerializeField] private Transform listContent;
        [SerializeField] private GameObject transmissionItemPrefab;
        [SerializeField] private Text statusText;

        private void OnEnable()
        {
            backButton.onClick.AddListener(() => screenManager.ShowEngineBrowser());
            if (skipButton != null)
                skipButton.onClick.AddListener(() => CreateBuild(null));
            LoadCompatible();
        }

        private void OnDisable()
        {
            backButton.onClick.RemoveAllListeners();
            if (skipButton != null)
                skipButton.onClick.RemoveAllListeners();
        }

        private void LoadCompatible()
        {
            string engineId = engineBrowser != null ? engineBrowser.SelectedEngineId : null;
            if (string.IsNullOrEmpty(engineId))
            {
                statusText.text = "No engine selected.";
                return;
            }

            statusText.text = "Loading compatible transmissions...";
            ClearList();

            transmissionService.GetCompatible(engineId,
                list =>
                {
                    statusText.text = list.total == 0 ? "No compatible transmissions." : $"{list.total} compatible";
                    foreach (var t in list.transmissions)
                        AddItem(t);
                },
                error => statusText.text = error);
        }

        private void AddItem(TransmissionResponse transmission)
        {
            if (transmissionItemPrefab == null || listContent == null) return;

            GameObject item = Instantiate(transmissionItemPrefab, listContent);
            Text label = item.GetComponentInChildren<Text>();
            if (label != null)
                label.text = $"{transmission.make} {transmission.model} ({transmission.bellhousing_pattern})";

            Button btn = item.GetComponent<Button>();
            if (btn != null)
            {
                string id = transmission.id;
                btn.onClick.AddListener(() => CreateBuild(id));
            }
        }

        private void CreateBuild(string transmissionId)
        {
            statusText.text = "Creating build...";

            var create = new BuildCreate
            {
                vehicle_id = vehicleBrowser != null ? vehicleBrowser.SelectedVehicleId : "",
                engine_id = engineBrowser != null ? engineBrowser.SelectedEngineId : "",
                transmission_id = transmissionId
            };

            buildService.CreateBuild(create,
                build =>
                {
                    var buildList = FindObjectOfType<BuildListScreen>();
                    if (buildList != null)
                    {
                        // Set selected build so detail screen can load it
                        typeof(BuildListScreen)
                            .GetField("_selectedBuildId", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)
                            ?.SetValue(buildList, build.id);
                    }
                    screenManager.ShowBuildDetail();
                },
                error => statusText.text = error);
        }

        private void ClearList()
        {
            if (listContent == null) return;
            foreach (Transform child in listContent)
                Destroy(child.gameObject);
        }
    }
}
