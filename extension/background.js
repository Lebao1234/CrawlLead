// Background service worker — xử lý mở tab profile để lấy email

chrome.runtime.onInstalled.addListener(() => {
  console.log("[LeadFinder] Extension installed");
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "open_profile_get_email") {
    const url = msg.url;

    chrome.tabs.create({ url, active: false }, (tab) => {
      if (!tab) return;
      const tabId = tab.id;
      let isResponded = false;

      let attempts = 0;
      const trySend = () => {
        if (isResponded) return;
        attempts++;
        if (attempts > 15) { // Tăng lên 15 lần
           isResponded = true;
           chrome.tabs.remove(tabId).catch(() => {});
           sendResponse({ lead: null });
           return;
        }
        
        chrome.tabs.sendMessage(tabId, { action: "extract_profile_email" }, (response) => {
          if (chrome.runtime.lastError || !response) {
             // Lỗi do đang redirect hoặc content chưa load xong -> thử lại
             setTimeout(trySend, 1500);
             return;
          }
          if (!isResponded) {
             isResponded = true;
             chrome.tabs.remove(tabId).catch(() => {});
             sendResponse({ lead: response.lead || null });
          }
        });
      };

      const listener = (updatedTabId, changeInfo) => {
        if (updatedTabId !== tabId || changeInfo.status !== "complete") return;
        chrome.tabs.onUpdated.removeListener(listener);
        setTimeout(trySend, 1000);
      };

      chrome.tabs.onUpdated.addListener(listener);

      setTimeout(() => {
        if (!isResponded) {
           isResponded = true;
           chrome.tabs.remove(tabId).catch(() => {});
           sendResponse({ lead: null });
        }
      }, 35000); // Tăng lên 35s
    });

    return true;
  }
});
