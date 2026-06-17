const BACKEND = CONFIG.API_URL;

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

// Phân tích đường dẫn (URL) hiện tại xem nó là loại trang nào của LinkedIn & Facebook
function getPageType(url) {
  if (!url) return "Unknown";
  const u = url.toLowerCase();
  
  // LinkedIn
  if (u.includes("linkedin.com/in/")) return "LinkedIn Profile";
  if (u.includes("linkedin.com/search/results/content")) return "LinkedIn Posts";
  if (u.includes("linkedin.com/search/")) return "LinkedIn Search";
  if (u.includes("linkedin.com/sales/")) return "LinkedIn Sales Navigator";
  if (u.includes("linkedin.com/feed") || u.includes("linkedin.com/recent-activity") || u.includes("linkedin.com/posts")) return "LinkedIn Posts";
  if (u.includes("linkedin.com")) return "LinkedIn (other)";

  // Facebook
  if (u.includes("facebook.com")) {
    if (/\/(posts|permalink|videos)\/\d/.test(url) || u.includes("/photos/") || u.includes("/photo.php") || u.includes("/photo/?")) {
      return "Facebook Post";
    }
    return "Facebook Feed";
  }
  
  return "Unsupported Page";
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

}

document.getElementById("openDashboard").addEventListener("click", () => {
  chrome.tabs.create({ url: CONFIG.DASHBOARD_URL });
});

document.getElementById("exportBtn").addEventListener("click", () => {
  chrome.tabs.create({ url: `${BACKEND}/api/export/csv` });
});

// Removed clearBtn since it's destructive and better kept on the dashboard

init();
