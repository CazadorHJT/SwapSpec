using UnityEngine;
using UnityEngine.UI;
using SwapSpec.Models;
using SwapSpec.Services;

namespace SwapSpec.UI
{
    public class BuildDetailScreen : MonoBehaviour
    {
        [Header("Services")]
        [SerializeField] private BuildService buildService;
        [SerializeField] private ScreenManager screenManager;

        [Header("Linked Screens")]
        [SerializeField] private BuildListScreen buildListScreen;

        [Header("UI Elements")]
        [SerializeField] private Text titleText;
        [SerializeField] private Text vehicleText;
        [SerializeField] private Text engineText;
        [SerializeField] private Text transmissionText;
        [SerializeField] private Text recommendationsText;
        [SerializeField] private Text statusText;
        [SerializeField] private Button backButton;
        [SerializeField] private Button chatButton;
        [SerializeField] private Button exportPdfButton;

        private string _buildId;

        private void OnEnable()
        {
            backButton.onClick.AddListener(() => screenManager.ShowBuildList());
            if (chatButton != null)
                chatButton.onClick.AddListener(() => screenManager.ShowAdvisorChat());
            if (exportPdfButton != null)
                exportPdfButton.onClick.AddListener(OnExportPdf);

            _buildId = buildListScreen != null ? buildListScreen.SelectedBuildId : null;
            if (!string.IsNullOrEmpty(_buildId))
                LoadBuildExport();
        }

        private void OnDisable()
        {
            backButton.onClick.RemoveAllListeners();
            if (chatButton != null)
                chatButton.onClick.RemoveAllListeners();
            if (exportPdfButton != null)
                exportPdfButton.onClick.RemoveAllListeners();
        }

        public string CurrentBuildId => _buildId;

        private void LoadBuildExport()
        {
            statusText.text = "Loading...";

            buildService.ExportBuild(_buildId,
                export =>
                {
                    statusText.text = "";
                    titleText.text = $"Build ({export.build.status})";

                    if (export.vehicle != null)
                        vehicleText.text = $"{export.vehicle.year} {export.vehicle.make} {export.vehicle.model} {export.vehicle.trim}".TrimEnd();

                    if (export.engine != null)
                    {
                        string hp = export.engine.power_hp > 0 ? $" - {export.engine.power_hp} HP" : "";
                        engineText.text = $"{export.engine.make} {export.engine.model} {export.engine.variant}{hp}".TrimEnd();
                    }

                    if (export.transmission != null)
                        transmissionText.text = $"{export.transmission.make} {export.transmission.model}";
                    else
                        transmissionText.text = "None selected";

                    if (export.recommendations != null && export.recommendations.Length > 0)
                        recommendationsText.text = string.Join("\n", export.recommendations);
                    else
                        recommendationsText.text = "No recommendations yet.";
                },
                error => statusText.text = error);
        }

        private void OnExportPdf()
        {
            if (string.IsNullOrEmpty(_buildId)) return;
            statusText.text = "Downloading PDF...";

            buildService.ExportBuildPDF(_buildId,
                data =>
                {
                    buildService.SavePDFToFile(data, _buildId);
                    statusText.text = "PDF saved!";
                },
                error => statusText.text = error);
        }
    }
}
