using UnityEngine;
using UnityEngine.UI;
using SwapSpec.Models;
using SwapSpec.Services;

namespace SwapSpec.UI
{
    public class AdvisorChatScreen : MonoBehaviour
    {
        [Header("Services")]
        [SerializeField] private AdvisorService advisorService;
        [SerializeField] private ScreenManager screenManager;

        [Header("Linked Screens")]
        [SerializeField] private BuildDetailScreen buildDetailScreen;

        [Header("UI Elements")]
        [SerializeField] private Transform messageListContent;
        [SerializeField] private GameObject messageItemPrefab;
        [SerializeField] private InputField messageInput;
        [SerializeField] private Button sendButton;
        [SerializeField] private Button backButton;
        [SerializeField] private Button clearButton;
        [SerializeField] private Text statusText;

        private string _buildId;

        private void OnEnable()
        {
            sendButton.onClick.AddListener(OnSend);
            backButton.onClick.AddListener(() => screenManager.ShowBuildDetail());
            if (clearButton != null)
                clearButton.onClick.AddListener(OnClear);

            _buildId = buildDetailScreen != null ? buildDetailScreen.CurrentBuildId : null;
            if (!string.IsNullOrEmpty(_buildId))
                LoadHistory();
        }

        private void OnDisable()
        {
            sendButton.onClick.RemoveAllListeners();
            backButton.onClick.RemoveAllListeners();
            if (clearButton != null)
                clearButton.onClick.RemoveAllListeners();
        }

        private void LoadHistory()
        {
            statusText.text = "Loading chat...";
            ClearMessages();

            advisorService.GetChatHistory(_buildId,
                history =>
                {
                    statusText.text = "";
                    foreach (var msg in history.messages)
                        AddMessageBubble(msg.role, msg.content);
                },
                error => statusText.text = error);
        }

        private void OnSend()
        {
            string text = messageInput.text.Trim();
            if (string.IsNullOrEmpty(text) || string.IsNullOrEmpty(_buildId)) return;

            messageInput.text = "";
            sendButton.interactable = false;
            AddMessageBubble("user", text);
            statusText.text = "Thinking...";

            advisorService.SendMessage(_buildId, text,
                response =>
                {
                    statusText.text = "";
                    sendButton.interactable = true;
                    AddMessageBubble("assistant", response.response);
                },
                error =>
                {
                    statusText.text = error;
                    sendButton.interactable = true;
                });
        }

        private void OnClear()
        {
            if (string.IsNullOrEmpty(_buildId)) return;

            advisorService.ClearChatHistory(_buildId,
                () =>
                {
                    ClearMessages();
                    statusText.text = "Chat cleared.";
                },
                error => statusText.text = error);
        }

        private void AddMessageBubble(string role, string content)
        {
            if (messageItemPrefab == null || messageListContent == null) return;

            GameObject item = Instantiate(messageItemPrefab, messageListContent);
            Text label = item.GetComponentInChildren<Text>();
            if (label != null)
            {
                string prefix = role == "user" ? "You" : "Advisor";
                label.text = $"<b>{prefix}:</b> {content}";
            }
        }

        private void ClearMessages()
        {
            if (messageListContent == null) return;
            foreach (Transform child in messageListContent)
                Destroy(child.gameObject);
        }
    }
}
