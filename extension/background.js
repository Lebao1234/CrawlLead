// Background service worker — Chạy ngầm trong trình duyệt.
// Nhiệm vụ chính: Mở các tab Profile ở dạng chạy ngầm (ẩn) để lấy thông tin email
// cho chức năng "Crawl đầy đủ" (Crawl danh sách với tuỳ chọn có email).

chrome.runtime.onInstalled.addListener(() => {
  console.log("[LeadFinder] Extension installed");
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "fetch_api") {
    const { url, options } = msg;
    fetch(url, options)
      .then(async (response) => {
        const text = await response.text();
        let data = null;
        try {
          data = JSON.parse(text);
        } catch (e) {
          data = text;
        }
        sendResponse({ ok: response.ok, status: response.status, data });
      })
      .catch((error) => {
        sendResponse({ ok: false, error: error.message });
      });
    return true; // Keep the message channel open for async response
  }

  if (msg.action === "open_profile_get_email") {
    const url = msg.url;

    // Tạo một tab mới ở trạng thái chạy ngầm (active: false) để tránh tự động nhảy tab làm gián đoạn người dùng
    chrome.tabs.create({ url, active: false }, (tab) => {
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
        
        // Gửi lệnh "extract_profile_email" cho content script của tab này để bắt đầu quét HTML
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
