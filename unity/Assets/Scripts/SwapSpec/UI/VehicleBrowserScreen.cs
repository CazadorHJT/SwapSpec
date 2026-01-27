using UnityEngine;
using UnityEngine.UI;
using SwapSpec.Models;
using SwapSpec.Services;

namespace SwapSpec.UI
{
    public class VehicleBrowserScreen : MonoBehaviour
    {
        [Header("Services")]
        [SerializeField] private VehicleService vehicleService;
        [SerializeField] private ScreenManager screenManager;

        [Header("UI Elements")]
        [SerializeField] private InputField searchMakeInput;
        [SerializeField] private InputField searchModelInput;
        [SerializeField] private Button searchButton;
        [SerializeField] private Button backButton;
        [SerializeField] private Transform listContent;
        [SerializeField] private GameObject vehicleItemPrefab;
        [SerializeField] private Text statusText;

        private string _selectedVehicleId;

        public string SelectedVehicleId => _selectedVehicleId;

        private void OnEnable()
        {
            searchButton.onClick.AddListener(OnSearch);
            backButton.onClick.AddListener(() => screenManager.ShowBuildList());
            OnSearch();
        }

        private void OnDisable()
        {
            searchButton.onClick.RemoveListener(OnSearch);
            backButton.onClick.RemoveAllListeners();
        }

        private void OnSearch()
        {
            statusText.text = "Searching...";
            ClearList();

            string make = string.IsNullOrWhiteSpace(searchMakeInput.text) ? null : searchMakeInput.text.Trim();
            string model = string.IsNullOrWhiteSpace(searchModelInput.text) ? null : searchModelInput.text.Trim();

            vehicleService.GetVehicles(
                list =>
                {
                    statusText.text = list.total == 0 ? "No vehicles found." : $"{list.total} vehicles";
                    foreach (var v in list.vehicles)
                        AddItem(v);
                },
                error => statusText.text = error,
                make: make, model: model);
        }

        private void AddItem(VehicleResponse vehicle)
        {
            if (vehicleItemPrefab == null || listContent == null) return;

            GameObject item = Instantiate(vehicleItemPrefab, listContent);
            Text label = item.GetComponentInChildren<Text>();
            if (label != null)
                label.text = $"{vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim}".TrimEnd();

            Button btn = item.GetComponent<Button>();
            if (btn != null)
            {
                string id = vehicle.id;
                btn.onClick.AddListener(() =>
                {
                    _selectedVehicleId = id;
                    screenManager.ShowEngineBrowser();
                });
            }
        }

        private void ClearList()
        {
            if (listContent == null) return;
            foreach (Transform child in listContent)
                Destroy(child.gameObject);
        }
    }
}
