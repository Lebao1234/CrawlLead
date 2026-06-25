// Mặc định kết nối thẳng tới backend local
const API = () => CONFIG.API_URL;
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
    document.getElementById("statTotal").textContent = d.total;
    document.getElementById("statVerified").textContent = d.verified;
    document.getElementById("statDupes").textContent = d.duplicates;
    document.getElementById("statNew").textContent = d.new;
    if (document.getElementById("statFbPosts")) {
      document.getElementById("statFbPosts").textContent = d.fb_posts || 0;
    }
    if (document.getElementById("statLkPosts")) {
      document.getElementById("statLkPosts").textContent = d.lk_posts || 0;
    }
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
      tokens.push({ type: 'PHRASE', value: query.slice(i + 1, j).toLowerCase() });
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
    else tokens.push({ type: 'WORD', value: word.toLowerCase() });
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
    case 'AND':   return evaluateBooleanAST(ast.left, text) && evaluateBooleanAST(ast.right, text);
    case 'OR':    return evaluateBooleanAST(ast.left, text) || evaluateBooleanAST(ast.right, text);
    case 'NOT':   return !evaluateBooleanAST(ast.operand, text);
    case 'PHRASE': return text.includes(ast.value);
    case 'TERM':  return text.includes(ast.value);
    default:      return true;
  }
}

// Helper: build a searchable string from a lead
function leadToSearchText(l) {
  return [l.name, l.position, l.title, l.company, l.email, l.phone, l.location].map(v => (v || '').toLowerCase()).join(' ');
}

// Helper: build a searchable string from a facebook post
function fbPostToSearchText(p) {
  return [p.author, p.group_name, p.content, p.content_snippet].map(v => (v || '').toLowerCase()).join(' ');
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
  const map = { new: ["pill-new","New"], verified: ["pill-verified","Verified"], duplicate: ["pill-duplicate","Duplicate"] };
  const [cls, label] = map[s] || ["pill-new", s];
  return `<span class="pill ${cls}"><span class="dot"></span>${label}</span>`;
}

// Lọc danh sách leads dựa trên Boolean Search query
function filtered(crawledByFilterId) {
  let result = allLeads;
  if (searchQuery) {
    const ast = getParsedQuery();
    if (ast) result = result.filter(l => evaluateBooleanAST(ast, leadToSearchText(l)));
  }
  // Lọc theo người crawl nếu có dropdown ID
  if (crawledByFilterId) {
    const crawledBy = document.getElementById(crawledByFilterId)?.value || "";
    if (crawledBy) result = result.filter(l => l.crawled_by === crawledBy);
  }
  return result;
}

function renderDashTable() {
  const tbody = document.getElementById("dashTable");
  const leads = filtered('filterCrawledByDash').slice(0, 50);
  if (!leads.length) { tbody.innerHTML = `<tr><td colspan="9"><div class="empty">No leads yet.<p>Install the Chrome extension and crawl LinkedIn to get started.</p></div></td></tr>`; updateBulkDeleteBtn(); return; }
  tbody.innerHTML = leads.map((l, i) => `
    <tr>
      <td><input type="checkbox" class="row-checkbox" value="${allLeads.indexOf(l)}" onchange="updateBulkDeleteBtn()"></td>
      <td><div class="lead-name">${esc(l.name||"—")}</div></td>
      <td style="font-size:12px;color:var(--muted)">${esc(l.position||l.title||"—")}</td>
      <td>${esc(l.company||"—")}</td>
      <td style="font-size:12px;color:var(--muted)">${esc(l.location||"—")}</td>
      <td style="font-size:12px;color:var(--muted)">${esc(l.email||"—")}</td>
      <td style="font-size:12px;color:var(--muted)">${esc(l.phone||"—")}</td>
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
  let leads = filtered('filterCrawledBy');
  if (filter) leads = leads.filter(l => l.status === filter);
  if (!leads.length) { tbody.innerHTML = `<tr><td colspan="11"><div class="empty">No leads found.</div></td></tr>`; updateBulkDeleteBtn(); return; }
  tbody.innerHTML = leads.map(l => `
    <tr>
      <td><input type="checkbox" class="row-checkbox" value="${allLeads.indexOf(l)}" onchange="updateBulkDeleteBtn()"></td>
      <td><div class="lead-name">${esc(l.name||"—")}</div></td>
      <td>${esc(l.position||l.title||"—")}</td>
      <td>${esc(l.company||"—")}</td>
      <td style="font-size:11px;color:var(--muted)">${esc(l.email||"—")}</td>
      <td style="font-size:11px;color:var(--muted)">${esc(l.phone||"—")}</td>
      <td style="font-size:11px">${l.linkedin_url ? `<a href="${esc(l.linkedin_url)}" target="_blank" style="color:var(--accent);text-decoration:none">View ↗</a>` : "—"}</td>
      <td>${statusPill(l.status)}</td>
      <td style="font-size:11px;color:var(--muted)">${(l.created_at||"").slice(0,10)||"—"}</td>
      <td><span class="tag">${esc(l.crawled_by||"—")}</span></td>
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
  if (!dupes.length) { tbody.innerHTML = `<tr><td colspan="6"><div class="empty">No duplicates found. 🎉</div></td></tr>`; return; }
  tbody.innerHTML = dupes.map(l => `
    <tr>
      <td><div class="lead-name">${esc(l.name||"—")}</div></td>
      <td>${esc(l.company||"—")}</td>
      <td style="font-size:11px;color:var(--muted)">${esc(l.email||"—")}</td>
      <td style="font-size:11px;color:var(--muted)">${esc(l.phone||"—")}</td>
      <td style="font-size:11px;color:var(--muted)">${l.linkedin_url ? `<a href="${esc(l.linkedin_url)}" target="_blank" style="color:var(--accent);text-decoration:none">View ↗</a>` : "—"}</td>
      <td>
        <button class="icon-btn del" onclick="deleteLead(${allLeads.indexOf(l)})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>
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

    allFbPosts = d.posts || [];
    renderFbPage();
    if (document.getElementById("navCountFb")) {
      document.getElementById("navCountFb").textContent = d.total || 0;
    }
  } catch {}
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

  if (!posts.length) { tbody.innerHTML = `<tr><td colspan="7"><div class="empty">No Facebook posts found.</div></td></tr>`; updateBulkDeleteBtn(); return; }
  
  tbody.innerHTML = posts.map((p, i) => `
    <tr>
      <td><input type="checkbox" class="row-checkbox" value="${allFbPosts.indexOf(p)}" onchange="updateBulkDeleteBtn()"></td>
      <td><div class="lead-name">${esc(p.author||"—")}</div></td>
      <td style="font-size:12px">${esc(p.group_name||"—")}</td>
      <td style="font-size:12px;color:var(--muted)">${esc(p.content_snippet||"—")}</td>
      <td style="font-size:11px">${p.post_url ? `<a href="${esc(p.post_url)}" target="_blank" style="color:var(--accent);text-decoration:none">View ↗</a>` : "—"}</td>
      <td style="font-size:11px;color:var(--muted)">${(p.created_at||"").slice(0,10)||"—"}</td>
      <td><span class="tag">${esc(p.crawled_by||"—")}</span></td>
      <td>
        <div class="actions">
          <button class="icon-btn del" onclick="deleteFbPost(${allFbPosts.indexOf(p)})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>
        </div>
      </td>
    </tr>`).join("");
  updateBulkDeleteBtn();
}

async function deleteFbPost(idx) {
  if (!confirm("Delete this post?")) return;
  await fetch(`${API()}/api/facebook/${idx}`, { method: "DELETE" });
  toast("Post deleted");
  fetchFbPosts(true);
}

async function clearAllFb() {
  if (!confirm("Delete ALL Facebook posts? This cannot be undone.")) return;
  await fetch(`${API()}/api/facebook/clear`, { method: "POST" });
  toast("All FB posts cleared", "error");
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
  
  const indices = Array.from(checked).map(cb => parseInt(cb.value)).sort((a,b) => b - a);
  for (let idx of indices) {
    await fetch(`${API()}/api/facebook/${idx}`, { method: "DELETE" });
  }
  
  toast('Đã xóa ' + checked.length + ' posts');
  fetchFbPosts(true);
}

// ─── LinkedIn Posts ───────────────────────────────────────────
async function fetchLkPosts(force = false) {
  try {
    const r = await fetch(`${API()}/api/lk-posts`);
    const d = await r.json();
    const isSelecting = document.querySelectorAll('#lkPostsTable .row-checkbox:checked').length > 0;
    if (isSelecting && !force) return;

    allLkPosts = d.posts || [];
    renderLkPage();
    if (document.getElementById("navCountLk")) {
      document.getElementById("navCountLk").textContent = d.total || 0;
    }
  } catch {}
}

function lkPostToSearchText(p) {
  return [p.author, p.author_headline, p.content_snippet, p.post_type].map(v => (v || '').toLowerCase()).join(' ');
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
    tbody.innerHTML = `<tr><td colspan="10"><div class="empty">No LinkedIn posts found.</div></td></tr>`;
    updateBulkDeleteBtn();
    return;
  }

  tbody.innerHTML = posts.map((p, i) => `
    <tr>
      <td><input type="checkbox" class="row-checkbox" value="${allLkPosts.indexOf(p)}" onchange="updateBulkDeleteBtn()"></td>
      <td><div class="lead-name">${esc(p.author||"—")}</div></td>
      <td style="font-size:12px">${esc(p.author_headline||"—")}</td>
      <td style="font-size:12px;color:var(--muted)">${esc(p.content_snippet||"—")}</td>
      <td style="font-size:11px"><span class="tag">${esc(p.post_type||"text")}</span></td>
      <td style="font-size:11px">${p.reactions_count || 0} reactions</td>
      <td style="font-size:11px">${p.post_url ? `<a href="${esc(p.post_url)}" target="_blank" style="color:var(--accent);text-decoration:none">View ↗</a>` : "—"}</td>
      <td style="font-size:11px;color:var(--muted)">${(p.created_at||"").slice(0,10)||"—"}</td>
      <td><span class="tag">${esc(p.crawled_by||"—")}</span></td>
      <td>
        <div class="actions">
          <button class="icon-btn del" onclick="deleteLkPost(${allLkPosts.indexOf(p)})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>
        </div>
      </td>
    </tr>`).join("");
  updateBulkDeleteBtn();
}

async function deleteLkPost(idx) {
  if (!confirm("Delete this LinkedIn post?")) return;
  await fetch(`${API()}/api/lk-posts/${idx}`, { method: "DELETE" });
  toast("LinkedIn post deleted");
  fetchLkPosts(true);
}

async function clearAllLkPosts() {
  if (!confirm("Delete ALL LinkedIn posts? This cannot be undone.")) return;
  await fetch(`${API()}/api/lk-posts/clear`, { method: "POST" });
  toast("All LinkedIn posts cleared", "error");
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
  
  toast('Đã xóa ' + checked.length + ' posts');
  fetchLkPosts(true);
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

function exportCSV(crawledBy) {
  const token = localStorage.getItem('jwt_token') || "";
  let url = `${API()}/api/export/csv?token=${token}`;
  if (crawledBy) url += `&crawled_by=${encodeURIComponent(crawledBy)}`;
  window.open(url, "_blank");
}

function exportXLSX(crawledBy) {
  const token = localStorage.getItem('jwt_token') || "";
  let url = `${API()}/api/export/xlsx?token=${token}`;
  if (crawledBy) url += `&crawled_by=${encodeURIComponent(crawledBy)}`;
  window.open(url, "_blank");
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
  const r = await fetch(`${API()}/api/leads`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(data) });
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
  } catch {}
}

function populateCrawlerDropdowns() {
  const dropdownIds = ['filterCrawledBy', 'filterCrawledByDash'];
  for (const id of dropdownIds) {
    const select = document.getElementById(id);
    if (!select) continue;
    // Giữ lại giá trị đang chọn
    const currentVal = select.value;
    // Xóa các option cũ (trừ option đầu tiên)
    while (select.options.length > 1) select.remove(1);
    // Thêm các crawler
    for (const crawler of allCrawlers) {
      const opt = document.createElement('option');
      opt.value = crawler;
      opt.textContent = crawler;
      select.appendChild(opt);
    }
    // Khôi phục giá trị đã chọn
    if (currentVal && allCrawlers.includes(currentVal)) {
      select.value = currentVal;
    }
  }
}

// ─── Init ─────────────────────────────────────────────────────
function fetchAllData() {
  fetchLeads();
  fetchFbPosts();
  fetchLkPosts();
  fetchCrawlers();
}

checkAuth();