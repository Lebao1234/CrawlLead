// Centralized SVG Icon Variables
const ICONS = {
  dashboard: `<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
  linkedin: `<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>`,
  facebook: `<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>`,
  users: `<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  duplicates: `<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  settings: `<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  verify: `<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
  delete: `<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
  search: `<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`,
  export: `<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`
};

// ─── Chuẩn hóa & Chuyển đổi Tiếng Việt (Unicode UTF-8 - High Speed) ──
const VIETNAMESE_ACCENTS_MAP = {
  'a': 'áàảãạăắằẳẵặâấầẩẫậ',
  'A': 'ÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬ',
  'd': 'đ',
  'D': 'Đ',
  'e': 'éèẻẽẹêếềểễệ',
  'E': 'ÉÈẺẼẸÊẾỀỂỄỆ',
  'i': 'íìỉĩị',
  'I': 'ÍÌỈĨỊ',
  'o': 'óòỏõọôốồổỗộơớờởỡợ',
  'O': 'ÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢ',
  'u': 'úùủũụưứừửữự',
  'U': 'ÚÙỦŨỤƯỨỪỬỮỰ',
  'y': 'ýỳỷỹỵ',
  'Y': 'ÝỲỶỸỴ'
};

const ACCENT_CHAR_LOOKUP = {};
let accentPattern = "";
for (const [target, sources] of Object.entries(VIETNAMESE_ACCENTS_MAP)) {
  for (const char of sources) {
    ACCENT_CHAR_LOOKUP[char] = target;
    accentPattern += char;
  }
}
const ACCENT_FAST_REGEX = new RegExp(`[${accentPattern}]`, 'g');

function removeVietnameseTones(str) {
  if (!str) return "";
  return str.replace(ACCENT_FAST_REGEX, char => ACCENT_CHAR_LOOKUP[char] || char);
}

function toVietnameseSlug(str) {
  return removeVietnameseTones(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// ─── i18n Language Switcher (Anh - Việt) ─────────────────────────
const I18N_DICTIONARY = {
  vi: {
    "nav.section_main": "DANH MỤC CHÍNH",
    "nav.section_system": "HỆ THỐNG",
    "nav.dashboard": "Bảng Điều Khiển",
    "nav.leads": "Danh Sách Lead",
    "nav.facebook": "Bài Viết Facebook",
    "nav.lkposts": "Bài Viết LinkedIn",
    "nav.dupes": "Lead Trùng Lặp",
    "nav.settings": "Cài Đặt & Nhật Ký",
    "search.placeholder": "Tìm kiếm leads (Cú pháp Boolean: AND, OR, NOT, \"chính xác\")...",
    "status.connecting": "Đang kết nối…",
    "status.online": "Backend Đã Kết Nối",
    "status.offline": "Backend Mất Kết Nối",
    "status.checking": "Đang kiểm tra…",
    "btn.signout": "Đăng xuất",
    "btn.export": "⚡ Xuất file CSV",
    "btn.delete": "Xóa lead",
    "btn.verify": "Xác minh",
    "btn.view_all": "Xem Tất Cả →",
    "dash.title": "Bảng Điều Khiển Tổng Quan",
    "dash.desc": "Tổng quan về danh sách leads cào được, tỷ lệ xác minh và hoạt động người cào.",
    "dash.recent_title": "Lead Mới Cào Gần Đây",
    "stat.total_leads": "TỔNG LƯỢNG LEAD",
    "stat.verified": "ĐÃ XÁC MINH",
    "stat.verified_desc": "Lead hợp lệ",
    "stat.error_leads": "LEAD BỊ LỖI",
    "stat.fb_posts": "LEAD TỪ BÀI FB",
    "stat.fb_desc": "Bài viết Facebook cào được",
    "stat.lk_posts": "LEAD TỪ BÀI LINKEDIN",
    "stat.lk_desc": "Bài viết LinkedIn cào được",
    "leads.title": "Danh Sách Lead LinkedIn",
    "leads.desc": "Toàn bộ danh sách liên hệ đã thu thập qua Chrome Extension.",
    "fb.title": "Bài Viết Facebook Đã Cào",
    "lk.title": "Bài Viết LinkedIn Đã Cào",
    "dupes.title": "Phát Hiện Lead Trùng Lặp",
    "settings.title": "Cài Đặt Hệ Thống & Trạng Thái",
    "settings.refresh": "Tần Suất Tự Động Cập Nhật",
    "settings.refresh_desc": "Khoảng thời gian (giây) tự động làm mới dữ liệu từ server.",
    "settings.health": "Trạng Thái Kết Nối Backend",
    "settings.health_desc": "Trạng thái kết nối máy chủ thời gian thực.",
    "drawer.title": "Thông Tin Chi Tiết Lead",
    "th.name": "Tên Lead",
    "th.position": "Chức danh",
    "th.company": "Công ty",
    "th.location": "Địa điểm",
    "th.email": "Email",
    "th.phone": "Số điện thoại",
    "th.status": "Trạng thái",
    "th.actions": "Hành động",
    "th.date": "Ngày cào",
    "th.crawled_by": "Người cào",
    "th.author": "Tác giả",
    "th.group": "Nhóm",
    "th.content": "Nội dung",
    "th.link": "Link bài viết",
    "th.type": "Loại bài",
    "th.reactions": "Lượt tương tác"
  },
  en: {
    "nav.section_main": "MAIN MENU",
    "nav.section_system": "SYSTEM",
    "nav.dashboard": "Dashboard",
    "nav.leads": "LinkedIn Leads",
    "nav.facebook": "Facebook Posts",
    "nav.lkposts": "LinkedIn Posts",
    "nav.dupes": "Duplicates",
    "nav.settings": "Settings & Logs",
    "search.placeholder": "Search leads (Boolean: AND, OR, NOT, \"exact\")...",
    "status.connecting": "Connecting…",
    "status.online": "Backend Online",
    "status.offline": "Backend Offline",
    "status.checking": "Checking…",
    "btn.signout": "Sign Out",
    "btn.export": "⚡ Export CSV",
    "btn.delete": "Delete Lead",
    "btn.verify": "Verify",
    "btn.view_all": "View All →",
    "dash.title": "Executive Dashboard",
    "dash.desc": "Overview of extracted leads, verification rates, and crawler activities.",
    "dash.recent_title": "Recent Extracted Leads",
    "stat.total_leads": "TOTAL LEADS",
    "stat.verified": "VERIFIED",
    "stat.verified_desc": "Validated Leads",
    "stat.error_leads": "ERROR LEADS",
    "stat.fb_posts": "FB POST LEADS",
    "stat.fb_desc": "Scraped Facebook Posts",
    "stat.lk_posts": "LK POST LEADS",
    "stat.lk_desc": "Scraped LinkedIn Posts",
    "leads.title": "LinkedIn Extracted Leads",
    "leads.desc": "Full list of contacts scraped via Chrome Extension.",
    "fb.title": "Facebook Scraped Posts",
    "lk.title": "LinkedIn Scraped Posts",
    "dupes.title": "Duplicate Detection",
    "settings.title": "System Settings & Health",
    "settings.refresh": "Auto-Refresh Interval",
    "settings.refresh_desc": "Frequency (in seconds) to pull live backend stats.",
    "settings.health": "Backend Health Status",
    "settings.health_desc": "Real-time status of backend service connection.",
    "drawer.title": "Lead Details Profile",
    "th.name": "Lead Name",
    "th.position": "Job Title",
    "th.company": "Company",
    "th.location": "Location",
    "th.email": "Email",
    "th.phone": "Phone",
    "th.status": "Status",
    "th.actions": "Actions",
    "th.date": "Date",
    "th.crawled_by": "Crawled By",
    "th.author": "Author",
    "th.group": "Group",
    "th.content": "Content",
    "th.link": "Link",
    "th.type": "Type",
    "th.reactions": "Reactions"
  }
};

class LanguageManager {
  constructor(dictionary, defaultLang = "vi") {
    this.dictionary = dictionary;
    const savedLang = localStorage.getItem("app_lang");
    const browserLang = navigator.language.startsWith("vi") ? "vi" : "en";
    this.currentLang = savedLang || browserLang || defaultLang;
    this.elementsCache = null;
  }

  init() {
    this.setLanguage(this.currentLang);
  }

  setLanguage(lang) {
    if (!this.dictionary[lang]) return;
    this.currentLang = lang;
    localStorage.setItem("app_lang", lang);
    document.documentElement.lang = lang;

    // Cache elements query selector to avoid DOM re-querying latency
    if (!this.elementsCache || this.elementsCache.length === 0) {
      this.elementsCache = Array.from(document.querySelectorAll("[data-i18n]"));
    }

    const dict = this.dictionary[lang];

    // Batch UI updates using requestAnimationFrame for smooth 60fps performance
    requestAnimationFrame(() => {
      for (let i = 0; i < this.elementsCache.length; i++) {
        const el = this.elementsCache[i];
        const key = el.getAttribute("data-i18n");
        const text = dict[key];
        if (text) {
          if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
            el.placeholder = text;
          } else {
            el.textContent = text;
          }
        }
      }

      const langBtn = document.getElementById("langToggleBtn");
      if (langBtn) {
        langBtn.textContent = lang === "vi" ? "🇻🇳 VI" : "🇬🇧 EN";
        langBtn.title = lang === "vi" ? "Chuyển sang Tiếng Anh (English)" : "Switch to Vietnamese (Tiếng Việt)";
      }

      // Refresh active views to update dynamic JS labels instantly
      if (typeof renderDashTable === 'function') renderDashTable();
      if (typeof renderLeadsPage === 'function') renderLeadsPage();
      if (typeof renderFbPage === 'function') renderFbPage();
      if (typeof renderLkPage === 'function') renderLkPage();
      if (typeof renderDupes === 'function') renderDupes();
    });
  }

  toggleLanguage() {
    const nextLang = this.currentLang === "vi" ? "en" : "vi";
    this.setLanguage(nextLang);
    return nextLang;
  }

  t(key) {
    return this.dictionary[this.currentLang]?.[key] || key;
  }
}

const i18n = new LanguageManager(I18N_DICTIONARY, "vi");
function toggleLanguage() {
  i18n.toggleLanguage();
}

// ─── Theme Switcher ──────────────────────────────────────────────
function initTheme() {
  const savedTheme = localStorage.getItem("theme") || "dark";
  document.documentElement.setAttribute("data-bs-theme", savedTheme);
  updateThemeIcon(savedTheme);
  i18n.init();
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-bs-theme") || "dark";
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-bs-theme", newTheme);
  localStorage.setItem("theme", newTheme);
  updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
  const btn = document.getElementById("themeToggleBtn");
  if (!btn) return;
  if (theme === "light") {
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    btn.title = "Chuyển sang Giao diện Tối (Dark Theme)";
  } else {
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
    btn.title = "Chuyển sang Giao diện Sáng (Light Theme)";
  }
}

// Mặc định kết nối thẳng tới backend local
const API = () => CONFIG.API_URL;
const DEBUG_MODE = false;
const logger = {
  log: (...args) => { if (DEBUG_MODE) console.log("[CrawlLead]", ...args); },
  warn: (...args) => console.warn("[CrawlLead]", ...args),
  error: (...args) => console.error("[CrawlLead]", ...args)
};

let allLeads = [];
let allFbPosts = [];
let allLkPosts = [];
let allCrawlers = [];
let searchQuery = "";
let refreshTimer = null;

// Authentication logic moved to auth.js

// ─── Navigation ───────────────────────────────────────────────
// Hàm dùng để chuyển đổi qua lại giữa các màn hình (Dashboard, Leads, Settings...)
function showPage(name) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById("page-" + name).classList.add("active");
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  event.currentTarget?.classList.add("active");
  if (name === "leads") renderLeadsPage();
  if (name === "facebook") renderFbPage();
  if (name === "lkposts") renderLkPage();
  if (name === "dupes") renderDupes();
  if (name === "settings") checkBackend();
  updateBulkDeleteBtn(); // Reset bulk button state on tab switch
}

// ─── Toast ────────────────────────────────────────────────────
let toastTimer;
function toast(msg, type = "success") {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = "show " + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.className = "", 3000);
}

// ─── API ──────────────────────────────────────────────────────
async function fetchStats() {
  try {
    const r = await fetch(`${API()}/api/stats`);
    const d = await r.json();
    if (document.getElementById("statTotal")) document.getElementById("statTotal").textContent = d.total ?? 0;
    if (document.getElementById("statVerified")) document.getElementById("statVerified").textContent = d.verified ?? 0;
    if (document.getElementById("statDupes")) document.getElementById("statDupes").textContent = d.duplicates ?? 0;
    if (document.getElementById("statNew")) document.getElementById("statNew").textContent = d.new ?? 0;
    if (document.getElementById("statFbPosts")) document.getElementById("statFbPosts").textContent = d.fb_posts ?? 0;
    if (document.getElementById("statLkPosts")) document.getElementById("statLkPosts").textContent = d.lk_posts ?? 0;

    // Leads bị lỗi / thiếu email
    if (document.getElementById("statNoEmail")) {
      document.getElementById("statNoEmail").textContent = d.error_leads ?? d.no_email ?? 0;
    }
    if (document.getElementById("statInvalidEmail")) {
      document.getElementById("statInvalidEmail").textContent = d.invalid_email ?? 0;
    }
    if (document.getElementById("statVerRate")) {
      const rate = d.total ? Math.round(d.verified / d.total * 100) : 0;
      document.getElementById("statVerRate").textContent = rate + "% verification rate";
    }
    if (document.getElementById("navCount")) document.getElementById("navCount").textContent = d.total ?? 0;
    if (document.getElementById("navCountFb")) document.getElementById("navCountFb").textContent = d.fb_posts ?? 0;
    if (document.getElementById("navCountLk")) document.getElementById("navCountLk").textContent = d.lk_posts ?? 0;
    setBackendOnline(true);
  } catch (err) {
    logger.warn("[CrawlLead] Error fetching stats:", err);
    setBackendOnline(false);
  }
}

// Nhấn vào card "LEAD BỊ LỖI" → chuyển sang trang Leads và lọc ngay các lead bị lỗi / thiếu email
function filterByNoEmail() {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById("page-leads").classList.add("active");
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));

  const statusFilter = document.getElementById("filterStatus");
  if (statusFilter) {
    statusFilter.value = "error";
  }
  renderLeadsPage();
}

let lastLeadsHash = "";
let lastFbHash = "";
let lastLkHash = "";

// ─── Realtime Data Sync (BroadcastChannel & LocalStorage) ─────
try {
  const syncChannel = new BroadcastChannel('crawllead_data_sync');
  syncChannel.onmessage = (e) => {
    if (e.data && e.data.type === 'REFRESH_DATA') {
      fetchAllData(true);
    }
  };
} catch (e) {}

window.addEventListener('storage', (e) => {
  if (e.key === 'crawllead_last_update') {
    fetchAllData(true);
  }
});

// Lấy danh sách Leads từ Backend về và cập nhật giao diện
async function fetchLeads(force = false) {
  try {
    const r = await fetch(`${API()}/api/leads`);
    const d = await r.json();

    // Tạm dừng cập nhật bảng nếu người dùng đang tick chọn (để tránh mất dấu tick)
    const isSelecting = document.querySelectorAll('.row-checkbox:checked').length > 0;
    if (isSelecting && !force) {
      setBackendOnline(true);
      return;
    }

    const leads = d.leads || [];
    const first = leads[0] || {};
    const last = leads[leads.length - 1] || {};
    const newHash = `${leads.length}_${first.created_at || ''}_${last.created_at || ''}_${first.email || ''}_${last.email || ''}_${first.name || ''}_${last.name || ''}`;

    if (!force && newHash === lastLeadsHash && allLeads.length === leads.length) {
      setBackendOnline(true);
      return;
    }

    lastLeadsHash = newHash;
    allLeads = leads;
    renderDashTable();
    renderLeadsPage();
    renderDupes();
    fetchStats();
  } catch { setBackendOnline(false); }
}

// Cập nhật trạng thái "Online/Offline" trên giao diện
function setBackendOnline(ok) {
  document.getElementById("backendDot").className = "backend-dot" + (ok ? " online" : "");
  document.getElementById("backendLabel").textContent = ok ? "Backend online" : "Backend offline";
  if (document.getElementById("settingStatus"))
    document.getElementById("settingStatus").textContent = ok ? "✓ Connected" : "✗ Unreachable";
}

async function checkBackend() {
  try { await fetch(`${API()}/api/stats`); setBackendOnline(true); }
  catch { setBackendOnline(false); }
}

// ─── Boolean Search Engine ────────────────────────────────────
// Tokenizer: splits query into tokens: QUOTED_STRING, AND, OR, NOT, (, ), WORD
function tokenizeBooleanQuery(query) {
  const tokens = [];
  let i = 0;
  while (i < query.length) {
    // Skip whitespace
    if (query[i] === ' ' || query[i] === '\t') { i++; continue; }
    // Quoted string
    if (query[i] === '"') {
      let j = i + 1;
      while (j < query.length && query[j] !== '"') j++;
      tokens.push({ type: 'PHRASE', value: removeVietnameseTones(query.slice(i + 1, j).toLowerCase()) });
      i = j + 1;
      continue;
    }
    // Parentheses
    if (query[i] === '(') { tokens.push({ type: 'LPAREN' }); i++; continue; }
    if (query[i] === ')') { tokens.push({ type: 'RPAREN' }); i++; continue; }
    // Word (could be AND/OR/NOT or a regular search term)
    let j = i;
    while (j < query.length && query[j] !== ' ' && query[j] !== '\t' && query[j] !== '(' && query[j] !== ')' && query[j] !== '"') j++;
    const word = query.slice(i, j);
    const upper = word.toUpperCase();
    if (upper === 'AND') tokens.push({ type: 'AND' });
    else if (upper === 'OR') tokens.push({ type: 'OR' });
    else if (upper === 'NOT') tokens.push({ type: 'NOT' });
    else tokens.push({ type: 'WORD', value: removeVietnameseTones(word.toLowerCase()) });
    i = j;
  }
  return tokens;
}

// Parser: recursive descent parser that builds an AST
// Grammar:
//   expression  = orExpr
//   orExpr      = andExpr (OR andExpr)*
//   andExpr     = notExpr ((AND | implicit) notExpr)*
//   notExpr     = NOT? primary
//   primary     = '(' expression ')' | PHRASE | WORD
function parseBooleanQuery(query) {
  if (!query || !query.trim()) return null;
  const tokens = tokenizeBooleanQuery(query);
  if (tokens.length === 0) return null;
  let pos = 0;

  function peek() { return pos < tokens.length ? tokens[pos] : null; }
  function consume() { return tokens[pos++]; }

  function parseOr() {
    let left = parseAnd();
    while (peek() && peek().type === 'OR') {
      consume(); // eat OR
      const right = parseAnd();
      left = { type: 'OR', left, right };
    }
    return left;
  }

  function parseAnd() {
    let left = parseNot();
    while (peek()) {
      const t = peek();
      if (t.type === 'AND') {
        consume(); // eat explicit AND
        const right = parseNot();
        left = { type: 'AND', left, right };
      } else if (t.type === 'WORD' || t.type === 'PHRASE' || t.type === 'NOT' || t.type === 'LPAREN') {
        // Implicit AND: two terms next to each other without operator
        const right = parseNot();
        left = { type: 'AND', left, right };
      } else {
        break;
      }
    }
    return left;
  }

  function parseNot() {
    if (peek() && peek().type === 'NOT') {
      consume(); // eat NOT
      const operand = parsePrimary();
      return { type: 'NOT', operand };
    }
    return parsePrimary();
  }

  function parsePrimary() {
    const t = peek();
    if (!t) return { type: 'TERM', value: '' };
    if (t.type === 'LPAREN') {
      consume(); // eat (
      const expr = parseOr();
      if (peek() && peek().type === 'RPAREN') consume(); // eat )
      return expr;
    }
    if (t.type === 'PHRASE') {
      consume();
      return { type: 'PHRASE', value: t.value };
    }
    if (t.type === 'WORD') {
      consume();
      return { type: 'TERM', value: t.value };
    }
    // Fallback: consume unexpected token
    consume();
    return { type: 'TERM', value: '' };
  }

  const ast = parseOr();
  return ast;
}

// Evaluator: checks if text matches the AST
function evaluateBooleanAST(ast, text) {
  if (!ast) return true;
  switch (ast.type) {
    case 'AND': return evaluateBooleanAST(ast.left, text) && evaluateBooleanAST(ast.right, text);
    case 'OR': return evaluateBooleanAST(ast.left, text) || evaluateBooleanAST(ast.right, text);
    case 'NOT': return !evaluateBooleanAST(ast.operand, text);
    case 'PHRASE': return text.includes(ast.value);
    case 'TERM': return text.includes(ast.value);
    default: return true;
  }
}

// Helper: build a searchable string from a lead (with memoization)
function leadToSearchText(l) {
  if (l._searchText !== undefined) return l._searchText;
  l._searchText = [l.name, l.position, l.title, l.company, l.email, l.phone, l.location].map(v => removeVietnameseTones((v || '').toLowerCase())).join(' ');
  return l._searchText;
}

// Helper: build a searchable string from a facebook post (with memoization)
function fbPostToSearchText(p) {
  if (p._searchText !== undefined) return p._searchText;
  p._searchText = [p.author, p.group_name, p.content, p.content_snippet].map(v => removeVietnameseTones((v || '').toLowerCase())).join(' ');
  return p._searchText;
}

// Helper: build a searchable string from a linkedin post (with memoization)
function lkPostToSearchText(p) {
  if (p._searchText !== undefined) return p._searchText;
  p._searchText = [p.author, p.author_headline, p.content_snippet, p.post_type].map(v => removeVietnameseTones((v || '').toLowerCase())).join(' ');
  return p._searchText;
}

// Cache parsed AST so we don't re-parse on every render cycle
let _cachedQuery = '';
let _cachedAST = null;
function getParsedQuery() {
  if (searchQuery !== _cachedQuery) {
    _cachedQuery = searchQuery;
    _cachedAST = parseBooleanQuery(searchQuery);
  }
  return _cachedAST;
}

// ─── Render ───────────────────────────────────────────────────
function statusPill(s) {
  const map = {
    new: ["pill-new", "Mới"],
    verified: ["pill-verified", "Đã xác minh"],
    duplicate: ["pill-duplicate", "Trùng lặp"],
    error: ["pill-error", "Bị lỗi"],
    failed: ["pill-error", "Lỗi"]
  };
  const [cls, label] = map[s] || ["pill-new", s];
  return `<span class="pill ${cls}"><span class="dot"></span>${label}</span>`;
}

// Lọc danh sách leads dựa trên Boolean Search query + user filter
function filtered(crawledByFilterId) {
  let result = allLeads;

  // 1. Boolean Search query
  if (searchQuery) {
    const ast = getParsedQuery();
    if (ast) result = result.filter(l => evaluateBooleanAST(ast, leadToSearchText(l)));
  }

  // 2. Lọc theo người cào (khớp cả String "userA" và Array ["userA", "userB"])
  if (crawledByFilterId) {
    const crawledBy = (document.getElementById(crawledByFilterId)?.value || "").trim();
    if (crawledBy) {
      result = result.filter(l => {
        const cb = l.crawled_by;
        if (!cb) return false;
        if (typeof cb === 'string') {
          // Xử lý trường hợp backend đã join thành "userA, userB"
          return cb.split(',').map(s => s.trim()).includes(crawledBy);
        }
        if (Array.isArray(cb)) return cb.includes(crawledBy);
        return false;
      });
      // Highlight active filter
      document.getElementById(crawledByFilterId)?.classList.add('has-filter');
    } else {
      document.getElementById(crawledByFilterId)?.classList.remove('has-filter');
    }
  }
  return result;
}

// Xóa tất cả bộ lọc leads
function clearLeadFilters() {
  const cb = document.getElementById('filterCrawledBy');
  const st = document.getElementById('filterStatus');
  if (cb) { cb.value = ''; cb.classList.remove('has-filter'); }
  if (st) { st.value = ''; st.classList.remove('has-filter'); }
  renderLeadsPage();
}

function renderDashTable() {
  const tbody = document.getElementById("dashTable");
  const leads = filtered('filterCrawledByDash').slice(0, 50);
  if (!leads.length) { tbody.innerHTML = `<tr><td colspan="9"><div class="empty">Chưa có lead nào.<p>Cài đặt Chrome Extension và cào LinkedIn để bắt đầu.</p></div></td></tr>`; updateBulkDeleteBtn(); return; }
  tbody.innerHTML = leads.map((l, i) => `
    <tr>
      <td><input type="checkbox" class="row-checkbox" value="${allLeads.indexOf(l)}" onchange="updateBulkDeleteBtn()"></td>
      <td><div class="lead-name" onclick="openDrawer(${allLeads.indexOf(l)})" style="cursor:pointer;color:var(--accent);font-weight:600;">${esc(l.name || "—")}</div></td>
      <td style="font-size:12px;color:var(--text-muted);">${esc(l.position || l.title || "—")}</td>
      <td style="font-weight:500;">${esc(l.company || "—")}</td>
      <td style="font-size:12px;color:var(--text-muted);">${esc(l.location || "—")}</td>
      <td style="font-size:12px;color:var(--text-muted);">${esc(l.email || "—")}</td>
      <td style="font-size:12px;color:var(--text-muted);">${esc(l.phone || "—")}</td>
      <td>${statusPill(l.status)}</td>
      <td>
        <div class="actions">
          <button class="icon-btn verify" title="Xác minh" onclick="verifyLead(${allLeads.indexOf(l)})">${ICONS.verify}</button>
          <button class="icon-btn del" title="Xóa" onclick="deleteLead(${allLeads.indexOf(l)})">${ICONS.delete}</button>
        </div>
      </td>
    </tr>`).join("");
  updateBulkDeleteBtn();
}

function renderLeadsPage() {
  const tbody = document.getElementById("leadsTable");

  // Lọc theo user
  let leads = filtered('filterCrawledBy');

  // Lọc theo status (đồng bộ với dropdown filterStatus)
  const statusFilter = document.getElementById("filterStatus")?.value || "";
  if (statusFilter) {
    if (statusFilter === "error") {
      leads = leads.filter(l => {
        const email = (l.email || "").trim().toLowerCase();
        const isEmailMissing = !email || ["chưa có", "n/a", "-", ""].includes(email) || !email.includes("@");
        return l.status === "error" || l.status === "failed" || isEmailMissing;
      });
    } else {
      leads = leads.filter(l => l.status === statusFilter);
    }
    document.getElementById('filterStatus')?.classList.add('has-filter');
  } else {
    document.getElementById('filterStatus')?.classList.remove('has-filter');
  }

  // Hiển thị số kết quả lọc
  const counter = document.getElementById('filterResultCount');
  if (counter) {
    counter.textContent = leads.length === allLeads.length
      ? `${leads.length} leads`
      : `${leads.length} / ${allLeads.length} leads`;
  }

  if (!leads.length) { tbody.innerHTML = `<tr><td colspan="11"><div class="empty">Không tìm thấy lead nào phù hợp.</div></td></tr>`; updateBulkDeleteBtn(); return; }
  tbody.innerHTML = leads.map(l => `
    <tr>
      <td><input type="checkbox" class="row-checkbox" value="${allLeads.indexOf(l)}" onchange="updateBulkDeleteBtn()"></td>
      <td><div class="lead-name">${esc(l.name || "—")}</div></td>
      <td>${esc(l.position || l.title || "—")}</td>
      <td>${esc(l.company || "—")}</td>
      <td style="font-size:11px;color:var(--muted)">${esc(l.email || "—")}</td>
      <td style="font-size:11px;color:var(--muted)">${esc(l.phone || "—")}</td>
      <td style="font-size:11px">${l.linkedin_url ? `<a href="${esc(l.linkedin_url)}" target="_blank" style="color:var(--accent);text-decoration:none">Xem ↗</a>` : "—"}</td>
      <td>${statusPill(l.status)}</td>
      <td style="font-size:11px;color:var(--muted)">${(l.created_at || "").slice(0, 10) || "—"}</td>
      <td><span class="tag">${esc(l.crawled_by || "—")}</span></td>
      <td>
        <div class="actions">
          <button class="icon-btn verify" title="Xác minh" onclick="verifyLead(${allLeads.indexOf(l)})">${ICONS.verify}</button>
          <button class="icon-btn del" title="Xóa" onclick="deleteLead(${allLeads.indexOf(l)})">${ICONS.delete}</button>
        </div>
      </td>
    </tr>`).join("");
  updateBulkDeleteBtn();
}

function renderDupes() {
  const tbody = document.getElementById("dupesTable");
  const dupes = allLeads.filter(l => l.status === "duplicate");
  if (!dupes.length) { tbody.innerHTML = `<tr><td colspan="6"><div class="empty">Không phát hiện lead trùng lặp nào. 🎉</div></td></tr>`; return; }
  tbody.innerHTML = dupes.map(l => `
    <tr>
      <td><div class="lead-name">${esc(l.name || "—")}</div></td>
      <td>${esc(l.company || "—")}</td>
      <td style="font-size:11px;color:var(--muted)">${esc(l.email || "—")}</td>
      <td style="font-size:11px;color:var(--muted)">${esc(l.phone || "—")}</td>
      <td style="font-size:11px;color:var(--muted)">${l.linkedin_url ? `<a href="${esc(l.linkedin_url)}" target="_blank" style="color:var(--accent);text-decoration:none">Xem ↗</a>` : "—"}</td>
      <td>
        <div class="actions">
          <button class="icon-btn del" title="Xóa" onclick="deleteLead(${allLeads.indexOf(l)})">${ICONS.delete}</button>
        </div>
      </td>
    </tr>`).join("");
}

// ─── Facebook ─────────────────────────────────────────────────
async function fetchFbPosts(force = false) {
  try {
    const r = await fetch(`${API()}/api/facebook`);
    const d = await r.json();
    const isSelecting = document.querySelectorAll('#facebookTable .row-checkbox:checked').length > 0;
    if (isSelecting && !force) return;

    const posts = d.posts || [];
    const newHash = posts.length + "_" + (posts[0]?.created_at || "");
    if (!force && newHash === lastFbHash && allFbPosts.length === posts.length) return;

    lastFbHash = newHash;
    allFbPosts = posts;
    renderFbPage();
    if (document.getElementById("navCountFb")) {
      document.getElementById("navCountFb").textContent = d.total || 0;
    }
  } catch (err) {
    console.warn("[CrawlLead] Error fetching Facebook posts:", err);
  }
}

function renderFbPage() {
  const tbody = document.getElementById("facebookTable");
  if (!tbody) return;
  const q = searchQuery.toLowerCase();
  let posts = allFbPosts;
  if (searchQuery) {
    const ast = getParsedQuery();
    if (ast) posts = posts.filter(p => evaluateBooleanAST(ast, fbPostToSearchText(p)));
  }

  if (!posts.length) { tbody.innerHTML = `<tr><td colspan="7"><div class="empty">Không tìm thấy bài viết Facebook nào.</div></td></tr>`; updateBulkDeleteBtn(); return; }

  tbody.innerHTML = posts.map((p, i) => `
    <tr>
      <td><input type="checkbox" class="row-checkbox" value="${allFbPosts.indexOf(p)}" onchange="updateBulkDeleteBtn()"></td>
      <td><div class="lead-name">${esc(p.author || "—")}</div></td>
      <td style="font-size:12px">${esc(p.group_name || "—")}</td>
      <td style="font-size:12px;color:var(--muted)">${esc(p.content_snippet || "—")}</td>
      <td style="font-size:11px">${p.post_url ? `<a href="${esc(p.post_url)}" target="_blank" style="color:var(--accent);text-decoration:none">Xem ↗</a>` : "—"}</td>
      <td style="font-size:11px;color:var(--muted)">${(p.created_at || "").slice(0, 10) || "—"}</td>
      <td><span class="tag">${esc(p.crawled_by || "—")}</span></td>
      <td>
        <div class="actions">
          <button class="icon-btn del" title="Xóa" onclick="deleteFbPost(${allFbPosts.indexOf(p)})">${ICONS.delete}</button>
        </div>
      </td>
    </tr>`).join("");
  updateBulkDeleteBtn();
}

async function deleteFbPost(idx) {
  if (!confirm("Bạn có chắc chắn muốn xóa bài viết này?")) return;
  await fetch(`${API()}/api/facebook/${idx}`, { method: "DELETE" });
  toast("Đã xóa bài viết Facebook");
  fetchFbPosts(true);
}

async function clearAllFb() {
  if (!confirm("Bạn có chắc chắn muốn xóa TẤT CẢ bài viết Facebook? Hành động này không thể hoàn tác.")) return;
  await fetch(`${API()}/api/facebook/clear`, { method: "POST" });
  toast("Đã xóa toàn bộ bài viết FB", "error");
  fetchFbPosts(true);
}

function toggleSelectAllFb(checkbox) {
  const checkboxes = document.querySelectorAll('#facebookTable .row-checkbox');
  checkboxes.forEach(cb => cb.checked = checkbox.checked);
  updateBulkDeleteBtn();
}

async function bulkDeleteFb() {
  const activePage = document.querySelector('.page.active');
  const checked = activePage.querySelectorAll('.row-checkbox:checked');
  if (checked.length === 0) return;
  if (!confirm('Bạn có chắc muốn xóa ' + checked.length + ' bài viết đã chọn?')) return;

  const indices = Array.from(checked).map(cb => parseInt(cb.value)).sort((a, b) => b - a);
  for (let idx of indices) {
    await fetch(`${API()}/api/facebook/${idx}`, { method: "DELETE" });
  }

  toast('Đã xóa ' + checked.length + ' bài viết');
  fetchFbPosts(true);
}

// ─── LinkedIn Posts ───────────────────────────────────────────
async function fetchLkPosts(force = false) {
  try {
    const r = await fetch(`${API()}/api/lk-posts`);
    const d = await r.json();
    const isSelecting = document.querySelectorAll('#lkPostsTable .row-checkbox:checked').length > 0;
    if (isSelecting && !force) return;

    const posts = d.posts || [];
    const newHash = posts.length + "_" + (posts[0]?.created_at || "");
    if (!force && newHash === lastLkHash && allLkPosts.length === posts.length) return;

    lastLkHash = newHash;
    allLkPosts = posts;
    renderLkPage();
    if (document.getElementById("navCountLk")) {
      document.getElementById("navCountLk").textContent = d.total || 0;
    }
  } catch (err) {
    console.warn("[CrawlLead] Error fetching LinkedIn posts:", err);
  }
}


function renderLkPage() {
  const tbody = document.getElementById("lkPostsTable");
  if (!tbody) return;
  const q = searchQuery.toLowerCase();
  let posts = allLkPosts;
  if (searchQuery) {
    const ast = getParsedQuery();
    if (ast) posts = posts.filter(p => evaluateBooleanAST(ast, lkPostToSearchText(p)));
  }

  if (!posts.length) {
    tbody.innerHTML = `<tr><td colspan="10"><div class="empty">Không tìm thấy bài viết LinkedIn nào.</div></td></tr>`;
    updateBulkDeleteBtn();
    return;
  }

  tbody.innerHTML = posts.map((p, i) => `
    <tr>
      <td><input type="checkbox" class="row-checkbox" value="${allLkPosts.indexOf(p)}" onchange="updateBulkDeleteBtn()"></td>
      <td><div class="lead-name">${esc(p.author || "—")}</div></td>
      <td style="font-size:12px">${esc(p.author_headline || "—")}</td>
      <td style="font-size:12px;color:var(--muted)">${esc(p.content_snippet || "—")}</td>
      <td style="font-size:11px"><span class="tag">${esc(p.post_type || "bài viết")}</span></td>
      <td style="font-size:11px">${p.reactions_count || 0} tương tác</td>
      <td style="font-size:11px">${p.post_url ? `<a href="${esc(p.post_url)}" target="_blank" style="color:var(--accent);text-decoration:none">Xem ↗</a>` : "—"}</td>
      <td style="font-size:11px;color:var(--muted)">${(p.created_at || "").slice(0, 10) || "—"}</td>
      <td><span class="tag">${esc(p.crawled_by || "—")}</span></td>
      <td>
        <div class="actions">
          <button class="icon-btn del" title="Xóa" onclick="deleteLkPost(${allLkPosts.indexOf(p)})">${ICONS.delete}</button>
        </div>
      </td>
    </tr>`).join("");
  updateBulkDeleteBtn();
}

async function deleteLkPost(idx) {
  if (!confirm("Bạn có chắc chắn muốn xóa bài viết LinkedIn này?")) return;
  await fetch(`${API()}/api/lk-posts/${idx}`, { method: "DELETE" });
  toast("Đã xóa bài viết LinkedIn");
  fetchLkPosts(true);
}

async function clearAllLkPosts() {
  if (!confirm("Bạn có chắc chắn muốn xóa TẤT CẢ bài viết LinkedIn? Hành động này không thể hoàn tác.")) return;
  await fetch(`${API()}/api/lk-posts/clear`, { method: "POST" });
  toast("Đã xóa toàn bộ bài viết LinkedIn", "error");
  fetchLkPosts(true);
}

function toggleSelectAllLk(checkbox) {
  const checkboxes = document.querySelectorAll('#lkPostsTable .row-checkbox');
  checkboxes.forEach(cb => cb.checked = checkbox.checked);
  updateBulkDeleteBtn();
}

async function bulkDeleteLkPosts() {
  const activePage = document.querySelector('.page.active');
  const checked = activePage.querySelectorAll('.row-checkbox:checked');
  if (checked.length === 0) return;
  if (!confirm('Bạn có chắc muốn xóa ' + checked.length + ' bài viết đã chọn?')) return;

  const indices = Array.from(checked).map(cb => parseInt(cb.value));

  await fetch(`${API()}/api/lk-posts/bulk-delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ indices })
  });

  toast('Đã xóa ' + checked.length + ' bài viết');
  fetchLkPosts(true);
}

// ─── Actions ──────────────────────────────────────────────────
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

function toggleSelectAll(checkbox, tableId) {
  const container = tableId ? document.getElementById(tableId) : document.querySelector('.page.active');
  const checkboxes = container ? container.querySelectorAll('.row-checkbox') : document.querySelectorAll('.page.active .row-checkbox');
  checkboxes.forEach(cb => cb.checked = checkbox.checked);
  updateBulkDeleteBtn();
}

function updateBulkDeleteBtn() {
  const activePage = document.querySelector('.page.active');
  if (!activePage) return;
  const checked = activePage.querySelectorAll('.row-checkbox:checked');
  const btn = activePage.querySelector('.btn-bulk-delete') || activePage.querySelector('.btn-bulk-delete-fb') || activePage.querySelector('.btn-bulk-delete-lk');
  const countSpan = activePage.querySelector('.bulk-count') || activePage.querySelector('.bulk-count-fb') || activePage.querySelector('.bulk-count-lk');

  if (btn && countSpan) {
    if (checked.length > 0) {
      btn.style.display = "inline-flex";
      countSpan.textContent = checked.length;
    } else {
      btn.style.display = "none";
    }
  }

  const selectAll = activePage.querySelector('.select-all');
  const allBoxes = activePage.querySelectorAll('.row-checkbox');
  if (selectAll) {
    selectAll.checked = (checked.length === allBoxes.length && allBoxes.length > 0);
  }
}

// Hàm gửi request xóa hàng loạt các dòng đã chọn lên Backend
async function bulkDelete() {
  const activePage = document.querySelector('.page.active');
  const checked = activePage.querySelectorAll('.row-checkbox:checked');
  if (checked.length === 0) return;
  if (!confirm(`Bạn có chắc muốn xóa ${checked.length} leads đã chọn?`)) return;

  const indices = Array.from(checked).map(cb => parseInt(cb.value));

  await fetch(`${API()}/api/leads/bulk-delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ indices })
  });

  toast(`Đã xóa ${checked.length} leads`);
  fetchLeads(true);
}

async function deleteLead(idx) {
  if (idx === undefined || idx === null || idx < 0) {
    toast("Không tìm thấy lead cần xóa", "error");
    return;
  }
  if (!confirm("Bạn có chắc chắn muốn xóa lead này?")) return;
  try {
    const res = await fetch(`${API()}/api/leads/${idx}`, { method: "DELETE" });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      toast("Đã xóa lead");
    } else {
      toast(d.error || "Lỗi khi xóa lead", "error");
    }
  } catch (e) {
    toast("Lỗi kết nối khi xóa lead", "error");
  }
  fetchLeads(true);
}

async function verifyLead(idx) {
  await fetch(`${API()}/api/leads/${idx}/verify`, { method: "POST" });
  toast("Đã xác minh lead ✓");
  fetchLeads(true);
}

async function clearAll() {
  if (!confirm("Xóa TẤT CẢ leads? Hành động này không thể hoàn tác.")) return;
  try {
    const res = await fetch(`${API()}/api/leads/clear`, { method: "POST" });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      toast(`Đã xóa tất cả ${d.deleted || 0} leads`);
    } else {
      toast(d.error || "Lỗi khi xóa tất cả leads", "error");
    }
  } catch (e) {
    toast("Lỗi kết nối", "error");
  }
  fetchLeads(true);
}

function exportCSV(crawledBy) {
  const token = localStorage.getItem('jwt_token') || "";
  let url = `${API()}/api/export/csv?token=${token}`;
  if (typeof crawledBy === 'string' && crawledBy) url += `&crawled_by=${encodeURIComponent(crawledBy)}`;
  window.open(url, "_blank");
}

function exportXLSX(crawledBy) {
  const token = localStorage.getItem('jwt_token') || "";
  let url = `${API()}/api/export/xlsx?token=${token}`;
  if (typeof crawledBy === 'string' && crawledBy) url += `&crawled_by=${encodeURIComponent(crawledBy)}`;
  window.open(url, "_blank");
}

// ─── Export & Import cho Facebook ──────────────────────────────
function exportFbCSV() {
  const token = localStorage.getItem('jwt_token') || "";
  window.open(`${API()}/api/facebook/export/csv?token=${token}`, "_blank");
}

function exportFbXLSX() {
  const token = localStorage.getItem('jwt_token') || "";
  window.open(`${API()}/api/facebook/export/xlsx?token=${token}`, "_blank");
}

async function importFbFile(input) {
  const file = input.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append("file", file);

  const token = localStorage.getItem('jwt_token') || "";
  toast("Đang import Facebook posts...");
  try {
    const r = await fetch(`${API()}/api/facebook/import`, {
      method: "POST",
      headers: { "Authorization": "Bearer " + token },
      body: formData
    });
    const res = await r.json();
    if (r.ok) {
      toast(`Đã import thành công ${res.added} posts, bỏ qua ${res.duplicates} trùng lặp.`);
      fetchFbPosts(true);
    } else {
      toast(res.error || "Lỗi import", "error");
    }
  } catch (e) {
    toast("Lỗi kết nối", "error");
  }
  input.value = "";
}

// ─── Export & Import cho LinkedIn ──────────────────────────────
function exportLkCSV() {
  const token = localStorage.getItem('jwt_token') || "";
  window.open(`${API()}/api/lk-posts/export/csv?token=${token}`, "_blank");
}

function exportLkXLSX() {
  const token = localStorage.getItem('jwt_token') || "";
  window.open(`${API()}/api/lk-posts/export/xlsx?token=${token}`, "_blank");
}

async function importLkFile(input) {
  const file = input.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append("file", file);

  const token = localStorage.getItem('jwt_token') || "";
  toast("Đang import LinkedIn posts...");
  try {
    const r = await fetch(`${API()}/api/lk-posts/import`, {
      method: "POST",
      headers: { "Authorization": "Bearer " + token },
      body: formData
    });
    const res = await r.json();
    if (r.ok) {
      toast(`Đã import thành công ${res.added} posts, bỏ qua ${res.duplicates} trùng lặp.`);
      fetchLkPosts(true);
    } else {
      toast(res.error || "Lỗi import", "error");
    }
  } catch (e) {
    toast("Lỗi kết nối", "error");
  }
  input.value = "";
}

// Export theo filter dropdown đang chọn
function exportCSVFiltered(filterId) {
  const crawledBy = document.getElementById(filterId)?.value || "";
  exportCSV(crawledBy);
}

function exportXLSXFiltered(filterId) {
  const crawledBy = document.getElementById(filterId)?.value || "";
  exportXLSX(crawledBy);
}

async function importJSON() {
  const raw = document.getElementById("importJson").value.trim();
  if (!raw) return;
  let data;
  try { data = JSON.parse(raw); } catch { toast("Invalid JSON", "error"); return; }
  const r = await fetch(`${API()}/api/leads`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  const res = await r.json();
  toast(`Added ${res.added}, skipped ${res.duplicates} dupes`);
  document.getElementById("importJson").value = "";
  fetchLeads(true);
}

function showSearchHelp(show) {
  const panel = document.getElementById('searchHelpPanel');
  if (panel) panel.classList.toggle('visible', show);
}

function onSearch(q) {
  searchQuery = q;
  renderDashTable();
  renderLeadsPage();
  renderFbPage();
  renderLkPage();
}

function saveSettings() {
  clearInterval(refreshTimer);
  const secs = parseInt(document.getElementById("settingRefresh").value) || 0;
  if (secs > 0) refreshTimer = setInterval(fetchLeads, secs * 1000);
}

// ─── Crawlers (Users) ─────────────────────────────────────────
async function fetchCrawlers() {
  try {
    const r = await fetch(`${API()}/api/crawlers`);
    const d = await r.json();
    allCrawlers = d.crawlers || [];
    populateCrawlerDropdowns();
  } catch (err) {
    console.warn("[CrawlLead] Error fetching crawlers list:", err);
  }
}

function populateCrawlerDropdowns() {
  const currentUser = localStorage.getItem('username') || '';

  const dropdownIds = ['filterCrawledBy', 'filterCrawledByDash'];
  for (const id of dropdownIds) {
    const select = document.getElementById(id);
    if (!select) continue;

    // Giữ lại giá trị đang chọn
    const currentVal = select.value;

    // Reset về đúng option mặc định đầu tiên
    select.innerHTML = `<option value="">👥 Tất cả người cào</option>`;

    // Thêm option "Của tôi" nếu user đang đăng nhập khớp với danh sách
    if (currentUser && allCrawlers.includes(currentUser)) {
      const myOpt = document.createElement('option');
      myOpt.value = currentUser;
      myOpt.textContent = `👤 Của tôi (${currentUser})`;
      select.appendChild(myOpt);
    }

    // Thêm từng crawler khác
    for (const crawler of allCrawlers) {
      if (crawler === currentUser) continue; // đã thêm ở trên
      const opt = document.createElement('option');
      opt.value = crawler;
      opt.textContent = `👨‍💻 ${crawler}`;
      select.appendChild(opt);
    }

    // Khôi phục giá trị đã chọn nếu còn hợp lệ
    if (currentVal && [...select.options].some(o => o.value === currentVal)) {
      select.value = currentVal;
    }
  }
}

// ─── Init ─────────────────────────────────────────────────────
function fetchAllData(force = false) {
  fetchLeads(force);
  fetchFbPosts(force);
  fetchLkPosts(force);
  fetchCrawlers();
}

initTheme();
checkAuth();

// Global Window Function Aliases
window.bulkDeleteLeads = bulkDelete;
window.bulkDeleteFbPosts = bulkDeleteFb;
window.bulkDeleteLkPosts = bulkDeleteLkPosts;