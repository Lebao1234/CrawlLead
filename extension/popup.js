const BACKEND = "https://crawllead.onrender.com";

// Kiểm tra xem Backend Server có đang chạy không bằng cách gọi API /api/stats
async function checkBackend() {
  try {
    const res = await fetch(`${BACKEND}/api/stats`, { signal: AbortSignal.timeout(2000) });
    const data = await res.json();
    document.getElementById("backendStatus").textContent = "✓ Online";
    document.getElementById("backendStatus").className = "status-val green";
    document.getElementById("totalLeads").textContent = data.total;
    return true;
  } catch {
    document.getElementById("backendStatus").textContent = "✗ Offline";
    document.getElementById("backendStatus").className = "status-val red";
    return false;
  }
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// Phân tích đường dẫn (URL) hiện tại xem nó là loại trang nào của LinkedIn
function getPageType(url) {
  if (!url) return "Unknown";
  if (url.includes("linkedin.com/in/")) return "Profile";
  if (url.includes("linkedin.com/search/")) return "Search results";
  if (url.includes("linkedin.com/sales/")) return "Sales Navigator";
  if (url.includes("linkedin.com")) return "LinkedIn (other)";
  return "Not LinkedIn";
}

// Khởi tạo popup khi người dùng vừa bấm vào icon Extension
async function init() {
  const online = await checkBackend();
  const tab = await getActiveTab();
  const url = tab?.url || "";
  const pageType = getPageType(url);

  document.getElementById("pageUrl").textContent = url.length > 60 ? url.slice(0, 60) + "…" : url;
  document.getElementById("pageType").textContent = pageType;

  const canCrawl = online && (pageType === "Profile" || pageType === "Search results" || pageType === "Sales Navigator");
  document.getElementById("crawlBtn").disabled = !canCrawl;
}

// Lắng nghe sự kiện click vào nút "Crawl this page"
document.getElementById("crawlBtn").addEventListener("click", async () => {
  const btn = document.getElementById("crawlBtn");
  const resultBox = document.getElementById("resultBox");
  const tab = await getActiveTab();
  const pageType = getPageType(tab?.url || "");

  btn.disabled = true;
  btn.textContent = "⏳ Crawling…";

  const action = pageType === "Profile" ? "crawl_profile" : "crawl_search";

  // Gửi lệnh "crawl_profile" hoặc "crawl_search" cho content.js đang chạy trên tab hiện tại
  chrome.tabs.sendMessage(tab.id, { action }, (response) => {
    if (chrome.runtime.lastError || !response) {
      resultBox.innerHTML = `<span style="color:#ef4444">❌ Could not connect to page. Refresh LinkedIn and try again.</span>`;
      resultBox.classList.add("visible");
      btn.textContent = "🔍 Crawl this page";
      btn.disabled = false;
      return;
    }

    const r = response.result;
    if (!r) {
      resultBox.innerHTML = `<span style="color:#ef4444">❌ Backend unreachable or error saving.</span>`;
    } else if (action === "crawl_profile") {
      resultBox.innerHTML = `<span style="color:#22c55e">✓ Saved:</span> ${response.lead?.name || "Lead"}<br><span style="color:#7a8099;font-size:11px">${response.lead?.position} @ ${response.lead?.company}</span>`;
    } else {
      resultBox.innerHTML = `<span style="color:#22c55e">✓ ${r?.added || 0} leads added</span><br><span style="color:#f59e0b;font-size:11px">${r?.duplicates || 0} duplicates skipped</span>`;
    }
    resultBox.classList.add("visible");
    btn.textContent = "🔍 Crawl this page";
    btn.disabled = false;
    checkBackend();
  });
});

document.getElementById("openDashboard").addEventListener("click", () => {
  chrome.tabs.create({ url: "http://localhost:3000" });
});

document.getElementById("exportBtn").addEventListener("click", () => {
  chrome.tabs.create({ url: `${BACKEND}/api/export/csv` });
});

document.getElementById("clearBtn").addEventListener("click", async () => {
  if (!confirm("Clear all leads?")) return;
  await fetch(`${BACKEND}/api/leads/clear`, { method: "POST" });
  checkBackend();
});

init();
