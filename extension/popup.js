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

async function checkAuthStatus() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['jwt_token'], (res) => {
      resolve(res.jwt_token ? true : false);
    });
  });
}

document.getElementById("extLoginBtn").addEventListener("click", async () => {
  const user = document.getElementById("extUser").value.trim();
  const pass = document.getElementById("extPass").value;
  const errorEl = document.getElementById("extAuthError");
  const btn = document.getElementById("extLoginBtn");
  
  if (!user || !pass) {
    errorEl.textContent = "Please enter username and password";
    errorEl.style.display = "block";
    return;
  }
  
  btn.textContent = "⏳ Logging in...";
  btn.disabled = true;
  errorEl.style.display = "none";
  
  try {
    const res = await fetch(`${BACKEND}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password: pass })
    });
    const d = await res.json();
    if (res.ok) {
      chrome.storage.local.set({ jwt_token: d.token }, () => {
        init(); // reload UI
      });
    } else {
      errorEl.textContent = d.error || "Login failed";
      errorEl.style.display = "block";
    }
  } catch (e) {
    errorEl.textContent = "Network error";
    errorEl.style.display = "block";
  }
  btn.textContent = "Login";
  btn.disabled = false;
});

document.getElementById("logoutExtBtn").addEventListener("click", () => {
  chrome.storage.local.remove(['jwt_token'], () => {
    init();
  });
});

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
  const isAuth = await checkAuthStatus();
  
  if (!isAuth) {
    document.getElementById("authSection").style.display = "block";
    document.getElementById("mainBody").style.display = "none";
    document.getElementById("mainFooter").style.display = "none";
    return;
  } else {
    document.getElementById("authSection").style.display = "none";
    document.getElementById("mainBody").style.display = "flex";
    document.getElementById("mainFooter").style.display = "flex";
  }

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
  chrome.tabs.create({ url: "https://crawllead.onrender.com" });
});

document.getElementById("exportBtn").addEventListener("click", () => {
  chrome.tabs.create({ url: `${BACKEND}/api/export/csv` });
});

// Removed clearBtn since it's destructive and better kept on the dashboard

init();
