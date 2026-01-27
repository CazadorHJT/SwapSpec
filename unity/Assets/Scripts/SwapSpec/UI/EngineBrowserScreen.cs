using UnityEngine;
using UnityEngine.UI;
using SwapSpec.Models;
using SwapSpec.Services;

namespace SwapSpec.UI
{
    public class EngineBrowserScreen : MonoBehaviour
    {
        [Header("Services")]
        [SerializeField] private EngineService engineService;
        [SerializeField] private ScreenManager screenManager;

        [Header("UI Elements")]
        [SerializeField] private InputField searchMakeInput;
        [SerializeField] private Button searchButton;
        [SerializeField] private Button backButton;
        [SerializeField] private Transform listContent;
        [SerializeField] private GameObject engineItemPrefab;
        [SerializeField] private Text statusText;

        private string _selectedEngineId;

        public string SelectedEngineId => _selectedEngineId;

        private void OnEnable()
        {
            searchButton.onClick.AddListener(OnSearch);
            backButton.onClick.AddListener(() => screenManager.ShowVehicleBrowser());
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

            engineService.GetEngines(
                list =>
                {
                    statusText.text = list.total == 0 ? "No engines found." : $"{list.total} engines";
                    foreach (var e in list.engines)
                        AddItem(e);
                },
                error => statusText.text = error,
                make: make);
        }

        private void AddItem(EngineResponse engine)
        {
            if (engineItemPrefab == null || listContent == null) return;

            GameObject item = Instantiate(engineItemPrefab, listContent);
            Text label = item.GetComponentInChildren<Text>();
            if (label != null)
            {
                string hp = engine.power_hp > 0 ? $" ({engine.power_hp} HP)" : "";
                label.text = $"{engine.make} {engine.model} {engine.variant}{hp}".TrimEnd();
            }

            Button btn = item.GetComponent<Button>();
            if (btn != null)
            {
                string id = engine.id;
                btn.onClick.AddListener(() =>
                {
                    _selectedEngineId = id;
                    screenManager.ShowTransmissionBrowser();
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
