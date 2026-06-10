// ─── Authentication ───────────────────────────────────────────
const originalFetch = window.fetch;
window.fetch = async function() {
  let [resource, config] = arguments;
  const token = localStorage.getItem('jwt_token');
  if (token && typeof resource === 'string' && resource.includes('/api/') && !resource.includes('/api/login') && !resource.includes('/api/register') && !resource.includes('/api/stats')) {
    if (!config) config = {};
    if (!config.headers) config.headers = {};
    config.headers['Authorization'] = 'Bearer ' + token;
  }
  const response = await originalFetch(resource, config);
  if (response.status === 401 && typeof resource === 'string' && resource.includes('/api/') && !resource.includes('/api/login')) {
    logout();
  }
  return response;
};

let isLoginMode = true;

function toggleAuthMode() {
  isLoginMode = !isLoginMode;
  const title = document.getElementById('authTitle');
  if (title) {
    title.textContent = isLoginMode ? 'Login' : 'Register';
    document.getElementById('authSubtitle').textContent = isLoginMode ? 'Enter your credentials' : 'Create a new account';
    document.getElementById('authSubmitBtn').textContent = isLoginMode ? 'Login' : 'Register';
    document.getElementById('authToggleText').textContent = isLoginMode ? 'Register' : 'Login';
  }
}

// Cung cấp hàm toast nếu chưa có (ví dụ khi ở trang login.html không có script.js)
function showMsg(msg, type = "success") {
  if (typeof toast === 'function') {
    toast(msg, type);
  } else {
    const el = document.getElementById("toast");
    if (!el) return alert(msg);
    el.textContent = msg;
    el.className = "show " + type;
    setTimeout(() => el.className = "", 3000);
  }
}

const API_URL = "http://localhost:5000";

async function submitAuth() {
  const user = document.getElementById('authUsername').value.trim();
  const pass = document.getElementById('authPassword').value;
  if (!user || !pass) return showMsg('Please enter username and password', 'error');
  
  const endpoint = isLoginMode ? '/api/login' : '/api/register';
  try {
    const r = await originalFetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password: pass })
    });
    const d = await r.json();
    if (r.ok) {
      if (isLoginMode) {
        localStorage.setItem('jwt_token', d.token);
        localStorage.setItem('username', d.username);
        document.getElementById('authUsername').value = '';
        document.getElementById('authPassword').value = '';
        window.location.href = 'index.html';
      } else {
        showMsg('Registered successfully. Please login.');
        toggleAuthMode();
      }
    } else {
      showMsg(d.error || 'Error', 'error');
    }
  } catch (e) {
    showMsg('Network error', 'error');
  }
}

function logout() {
  localStorage.removeItem('jwt_token');
  localStorage.removeItem('username');
  window.location.href = 'login.html';
}

function checkAuth() {
  const token = localStorage.getItem('jwt_token');
  const isLoginPage = window.location.pathname.endsWith('login.html');

  if (!token) {
    if (!isLoginPage) {
      window.location.href = 'login.html';
    }
  } else {
    if (isLoginPage) {
      window.location.href = 'index.html';
    } else {
      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) logoutBtn.style.display = 'inline-flex';
      
      const userAvatar = document.getElementById('userAvatar');
      if (userAvatar) userAvatar.textContent = (localStorage.getItem('username') || 'LF').substring(0, 2).toUpperCase();
      
      if (typeof fetchAllData === 'function') fetchAllData();
      const secs = parseInt(document.getElementById("settingRefresh")?.value) || 5;
      
      if (secs > 0 && typeof fetchAllData === 'function') {
        if (typeof refreshTimer !== 'undefined' && refreshTimer) clearInterval(refreshTimer);
        refreshTimer = setInterval(fetchAllData, secs * 1000);
      }
    }
  }
}

// Tự động kiểm tra phiên đăng nhập ngay khi tải trang
document.addEventListener('DOMContentLoaded', checkAuth);
