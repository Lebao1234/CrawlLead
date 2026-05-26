// Lấy URL của Backend API từ ô cài đặt (hoặc dùng mặc định nếu trống)
const API = () => document.getElementById("settingBackend")?.value || "https://leadfinder-ybvo.onrender.com";
let allLeads = [];
let searchQuery = "";
let refreshTimer = null;

// ─── Navigation ───────────────────────────────────────────────
// Hàm dùng để chuyển đổi qua lại giữa các màn hình (Dashboard, Leads, Settings...)
function showPage(name) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById("page-" + name).classList.add("active");
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  event.currentTarget?.classList.add("active");
  if (name === "leads") renderLeadsPage();
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
    document.getElementById("statTotal").textContent = d.total;
    document.getElementById("statVerified").textContent = d.verified;
    document.getElementById("statDupes").textContent = d.duplicates;
    document.getElementById("statNew").textContent = d.new;
    const rate = d.total ? Math.round(d.verified / d.total * 100) : 0;
    document.getElementById("statVerRate").textContent = rate + "% verification rate";
    document.getElementById("navCount").textContent = d.total;
    setBackendOnline(true);
  } catch { setBackendOnline(false); }
}

// Lấy danh sách Leads từ Backend về và cập nhật giao diện
async function fetchLeads(force = false) {
  try {
    const r = await fetch(`${API()}/api/leads`);
    const d = await r.json();
    
    // Tạm dừng cập nhật bảng nếu người dùng đang tick chọn (để tránh mất dấu tick)
    // Chỉ áp dụng cho auto-refresh (force = false)
    const isSelecting = document.querySelectorAll('.row-checkbox:checked').length > 0;
    if (isSelecting && !force) {
      setBackendOnline(true);
      return; 
    }

    allLeads = d.leads || [];
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

// ─── Render ───────────────────────────────────────────────────
function statusPill(s) {
  const map = { new: ["pill-new","New"], verified: ["pill-verified","Verified"], duplicate: ["pill-duplicate","Duplicate"] };
  const [cls, label] = map[s] || ["pill-new", s];
  return `<span class="pill ${cls}"><span class="dot"></span>${label}</span>`;
}

// Lọc danh sách leads dựa trên từ khóa tìm kiếm (searchQuery)
function filtered() {
  if (!searchQuery) return allLeads;
  const q = searchQuery.toLowerCase();
  return allLeads.filter(l => (l.name||"").toLowerCase().includes(q) || (l.company||"").toLowerCase().includes(q) || (l.email||"").toLowerCase().includes(q));
}

function renderDashTable() {
  const tbody = document.getElementById("dashTable");
  const leads = filtered().slice(0, 50);
  if (!leads.length) { tbody.innerHTML = `<tr><td colspan="8"><div class="empty">No leads yet.<p>Install the Chrome extension and crawl LinkedIn to get started.</p></div></td></tr>`; updateBulkDeleteBtn(); return; }
  tbody.innerHTML = leads.map((l, i) => `
    <tr>
      <td><input type="checkbox" class="row-checkbox" value="${allLeads.indexOf(l)}" onchange="updateBulkDeleteBtn()"></td>
      <td><div class="lead-name">${esc(l.name||"—")}</div></td>
      <td style="font-size:12px;color:var(--muted)">${esc(l.position||l.title||"—")}</td>
      <td>${esc(l.company||"—")}</td>
      <td style="font-size:12px;color:var(--muted)">${esc(l.location||"—")}</td>
      <td style="font-size:12px;color:var(--muted)">${esc(l.email||"—")}</td>
      <td>${statusPill(l.status)}</td>
      <td>
        <div class="actions">
          <button class="icon-btn verify" title="Verify" onclick="verifyLead(${allLeads.indexOf(l)})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></button>
          <button class="icon-btn del" title="Delete" onclick="deleteLead(${allLeads.indexOf(l)})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>
        </div>
      </td>
    </tr>`).join("");
  updateBulkDeleteBtn();
}

function renderLeadsPage() {
  const tbody = document.getElementById("leadsTable");
  const filter = document.getElementById("filterStatus")?.value || "";
  let leads = filtered();
  if (filter) leads = leads.filter(l => l.status === filter);
  if (!leads.length) { tbody.innerHTML = `<tr><td colspan="9"><div class="empty">No leads found.</div></td></tr>`; updateBulkDeleteBtn(); return; }
  tbody.innerHTML = leads.map(l => `
    <tr>
      <td><input type="checkbox" class="row-checkbox" value="${allLeads.indexOf(l)}" onchange="updateBulkDeleteBtn()"></td>
      <td><div class="lead-name">${esc(l.name||"—")}</div></td>
      <td>${esc(l.position||l.title||"—")}</td>
      <td>${esc(l.company||"—")}</td>
      <td style="font-size:11px;color:var(--muted)">${esc(l.email||"—")}</td>
      <td style="font-size:11px">${l.linkedin_url ? `<a href="${esc(l.linkedin_url)}" target="_blank" style="color:var(--accent);text-decoration:none">View ↗</a>` : "—"}</td>
      <td>${statusPill(l.status)}</td>
      <td style="font-size:11px;color:var(--muted)">${(l.created_at||"").slice(0,10)||"—"}</td>
      <td>
        <div class="actions">
          <button class="icon-btn verify" onclick="verifyLead(${allLeads.indexOf(l)})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></button>
          <button class="icon-btn del" onclick="deleteLead(${allLeads.indexOf(l)})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>
        </div>
      </td>
    </tr>`).join("");
  updateBulkDeleteBtn();
}

function renderDupes() {
  const tbody = document.getElementById("dupesTable");
  const dupes = allLeads.filter(l => l.status === "duplicate");
  if (!dupes.length) { tbody.innerHTML = `<tr><td colspan="5"><div class="empty">No duplicates found. 🎉</div></td></tr>`; return; }
  tbody.innerHTML = dupes.map(l => `
    <tr>
      <td><div class="lead-name">${esc(l.name||"—")}</div></td>
      <td>${esc(l.company||"—")}</td>
      <td style="font-size:11px;color:var(--muted)">${esc(l.email||"—")}</td>
      <td style="font-size:11px;color:var(--muted)">${l.linkedin_url ? `<a href="${esc(l.linkedin_url)}" target="_blank" style="color:var(--accent);text-decoration:none">View ↗</a>` : "—"}</td>
      <td>
        <button class="icon-btn del" onclick="deleteLead(${allLeads.indexOf(l)})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>
      </td>
    </tr>`).join("");
}

// ─── Actions ──────────────────────────────────────────────────
function esc(s) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

function toggleSelectAll(checkbox, tableId) {
  const checkboxes = document.querySelectorAll(`#${tableId} .row-checkbox`);
  checkboxes.forEach(cb => cb.checked = checkbox.checked);
  updateBulkDeleteBtn();
}

function updateBulkDeleteBtn() {
  const activePage = document.querySelector('.page.active');
  if (!activePage) return;
  const checked = activePage.querySelectorAll('.row-checkbox:checked');
  const btn = activePage.querySelector('.btn-bulk-delete');
  const countSpan = activePage.querySelector('.bulk-count');
  
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
  if (!confirm("Delete this lead?")) return;
  await fetch(`${API()}/api/leads/${idx}`, { method: "DELETE" });
  toast("Lead deleted");
  fetchLeads(true);
}

async function verifyLead(idx) {
  await fetch(`${API()}/api/leads/${idx}/verify`, { method: "POST" });
  toast("Lead verified ✓");
  fetchLeads(true);
}

async function clearAll() {
  if (!confirm("Delete ALL leads? This cannot be undone.")) return;
  await fetch(`${API()}/api/leads/clear`, { method: "POST" });
  toast("All leads cleared", "error");
  fetchLeads(true);
}

function exportCSV() {
  window.open(`${API()}/api/export/csv`, "_blank");
}

async function importJSON() {
  const raw = document.getElementById("importJson").value.trim();
  if (!raw) return;
  let data;
  try { data = JSON.parse(raw); } catch { toast("Invalid JSON", "error"); return; }
  const r = await fetch(`${API()}/api/leads`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(data) });
  const res = await r.json();
  toast(`Added ${res.added}, skipped ${res.duplicates} dupes`);
  document.getElementById("importJson").value = "";
  fetchLeads(true);
}

function onSearch(q) {
  searchQuery = q;
  renderDashTable();
  renderLeadsPage();
}

function saveSettings() {
  clearInterval(refreshTimer);
  const secs = parseInt(document.getElementById("settingRefresh").value) || 0;
  if (secs > 0) refreshTimer = setInterval(fetchLeads, secs * 1000);
}

// ─── Init ─────────────────────────────────────────────────────
fetchLeads();
const secs = parseInt(document.getElementById("settingRefresh")?.value) || 5;
if (secs > 0) refreshTimer = setInterval(fetchLeads, secs * 1000);