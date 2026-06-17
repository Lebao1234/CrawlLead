(function() {
const BACKEND_URL = CONFIG.API_URL + "/";

function normalizeUrl(url) {
  if (!url) return "";
  let u = url.trim().split("?")[0];
  if (u.endsWith("/")) u = u.slice(0, -1);
  u = u.replace(/^https?:\/\/[a-z]{2,3}\.linkedin\.com/, "https://www.linkedin.com");
  u = u.replace(/^https?:\/\/linkedin\.com/, "https://www.linkedin.com");
  return u;
}


/**
 * Hàm lấy thông tin của một người dùng từ trang Profile LinkedIn (ví dụ: Tên, Chức vụ, Công ty...)
 * Hàm này dùng các selector HTML (CSS Selector) để bóc tách dữ liệu từ cấu trúc web LinkedIn.
 */
function extractProfileFromPage() {
  const getText = (...selectors) => {
    for (const sel of selectors) {
      try {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
          const t = (el.innerText || el.textContent || "").trim();
          if (t && t.length > 1) return t;
        }
      } catch(e) {}
    }
    return "";
  };

  const name = getText("h1.text-heading-xlarge", "h1.inline", "h1[class*='heading']", "h1");
  const position = getText(".text-body-medium.break-words", ".ph5 .text-body-medium", "div.text-body-medium");
  // Chỉ tìm location ở khu vực thông tin cá nhân (bên trái) để tránh dính tên công ty
  const location = getText(
    ".pv-text-details__left-panel span.text-body-small.inline.t-black--light.break-words",
    ".pv-text-details__left-panel span.text-body-small",
    "div[data-section='current'] span.text-body-small",
    "span.text-body-small.inline.t-black--light.break-words"
  );
  // 1. Ưu tiên lấy company từ Top Card (panel bên phải, có icon công ty)
let company = "";

// === Tầng 1: Right panel buttons & links ===
const rightBtns = document.querySelectorAll(".pv-text-details__right-panel button, .pv-text-details__right-panel a, .pv-text-details__right-panel li");
for (const btn of rightBtns) {
  const label = (btn.getAttribute("aria-label") || "").toLowerCase();
  const href = (btn.getAttribute("href") || "").toLowerCase();
  
  if (label.match(/education|học vấn|school|trường|university|đại học/i) || href.includes("/school/")) continue;
  
  const text = btn.innerText.trim();
  if (text && text.length > 2 && text.length < 100) {
    // Tránh bị nhầm với trường học nếu không có aria-label
    if (text.match(/university|school|đại học|trường|academy|college/i)) continue;
    
    // Thường text lấy ra có thể kèm nhiều dòng nếu có icon, ta lấy dòng đầu tiên có chữ
    const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length > 0) {
      company = lines[0];
      break;
    }
  }
}

// === Tầng 2 & 3: Các thẻ div chứa text trong Top Card (Fallback cho EDUTO và các UI khác) ===
if (!company) {
  const topCard = document.querySelector(".ph5.pb5") || document.querySelector(".ph5") || document.querySelector(".mt2") || document;
  const candidates = topCard.querySelectorAll("div[class*='inline-show-more-text'][dir='ltr'][tabindex='-1'], div[dir='ltr'][tabindex='-1']");
  
  for (const div of candidates) {
    const text = div.innerText.trim().split("\n")[0].trim();
    // Lọc rác: phải có độ dài hợp lý
    if (text.length < 2 || text.length > 100) continue;
    if (text.match(/university|school|đại học|trường|academy|college|tháng|năm|\d{4}/i)) continue;
    
    // Nếu nó chứa các từ quen thuộc của headline thì bỏ qua
    if (text.includes("|") || text.toLowerCase().includes("kỹ năng")) continue;
    
    company = text;
    break;
  }
}

// === Tầng 4: Experience section (cách cũ giữ nguyên) ===
if (!company) {
  const expSection = document.querySelector("#experience");
  if (expSection) {
    const section = expSection.closest("section");
    if (section) {
      const firstItem = section.querySelector("ul > li");
      if (firstItem) {
        const secondary = firstItem.querySelector(
          ".t-14.t-normal span[aria-hidden='true'], .pvs-entity__secondary-title span[aria-hidden='true']"
        );
        if (secondary) {
          company = secondary.innerText.trim().split(" · ")[0];
        } else {
          const spans = Array.from(firstItem.querySelectorAll("span[aria-hidden='true']"))
            .map(s => s.innerText.trim())
            .filter(t => t.length > 1);
          if (spans.length >= 2) {
            const isDuration = spans[1].match(/(yr|mo|năm|tháng|year|month)/i);
            company = isDuration ? spans[0] : spans[1].split(" · ")[0];
          } else if (spans.length === 1) {
            company = spans[0];
          }
        }
      }
    }
  }
}

// === Dọn dẹp ===
if (company) {
  const lower = company.toLowerCase();
  if (lower === "kinh nghiệm" || lower === "experience" 
   || lower.includes(" tháng") || lower.includes(" mos")) {
    company = "";
  }
}

if (!company) company = "Chưa có";

if (company === "Chưa có" && position) {
  // Thử đoán company từ chức vụ nếu Top Card không có (tránh lỗi tab ngầm)
  const lowerPos = position.toLowerCase();
  if (position.includes(" @ ")) {
    company = position.split(" @ ")[1].split(" | ")[0].trim();
  } else if (lowerPos.includes(" at ")) {
    const match = position.match(/\s+at\s+([^|]+)/i);
    if (match) company = match[1].trim();
  } else if (lowerPos.includes(" tại ")) {
    const match = position.match(/\s+tại\s+([^|]+)/i);
    if (match) company = match[1].trim();
  }
}

  let email = "";
  const emailEl = document.querySelector("a[href^='mailto:']");
  if (emailEl) email = emailEl.href.replace("mailto:", "").trim();

  let phone = "";
  const phoneEl = document.querySelector("a[href^='tel:']");
  if (phoneEl) phone = phoneEl.href.replace("tel:", "").trim();

  const linkedin_url = normalizeUrl(window.location.href);
  return { name, position, company, location, email, phone, linkedin_url };
}

/**
 * Hàm mở phần "Contact Info" (Thông tin liên hệ) trên Profile LinkedIn để lấy email.
 * Vì email thường bị ẩn, hàm này giả lập thao tác click mở popup rồi quét text bên trong.
 */
async function getContactDetailsFromContactInfo() {
  try {
    let contactBtn = document.querySelector("a[href*='overlay/contact-info'], a[id*='contact-info'], #topcard-contact-info");
    if (!contactBtn) {
      const links = document.querySelectorAll("a");
      for (const link of links) {
        const text = (link.textContent || "").trim().toLowerCase();
        if (text === "contact info" || text === "thông tin liên hệ") {
          contactBtn = link;
          break;
        }
      }
    }
    if (!contactBtn) return { email: "", phone: "" };
    
    let email = "";
    let phone = "";
    
    contactBtn.scrollIntoView({ block: "center" });
    // Giả lập thời gian chờ của người dùng thật từ 1.2s đến 2.5s trước khi click để tránh bị hệ thống chống bot phát hiện
    const humanDelay = Math.floor(Math.random() * 1300) + 1200;
    await new Promise(r => setTimeout(r, humanDelay));
    contactBtn.click();
    
    let modal = null;
    for (let i = 0; i < 15; i++) {
      modal = document.querySelector(".artdeco-modal, [role='dialog'], #artdeco-modal-outlet");
      if (modal && modal.innerText && modal.innerText.length > 50) {
        break;
      }
      await new Promise(r => setTimeout(r, 200));
    }
    
    if (modal) {
      const emailEl = modal.querySelector("a[href^='mailto:'], section.ci-email a, .pv-contact-info__contact-link[href^='mailto:']");
      if (emailEl) {
        email = emailEl.href.replace("mailto:", "").trim();
      } else {
        const sections = modal.querySelectorAll("section");
        for (const sec of sections) {
          const header = sec.querySelector("h3");
          const headerText = header ? header.innerText.toLowerCase() : "";
          if (headerText.includes("email") || headerText.includes("thư điện tử")) {
            const valEl = sec.querySelector("span, li, a");
            if (valEl) {
              email = valEl.innerText.trim();
              break;
            }
          }
        }
      }
      
      const phoneEl = modal.querySelector("a[href^='tel:'], section.ci-phone a, section.ci-phone span, .pv-contact-info__contact-link[href^='tel:']");
      if (phoneEl) {
        let rawPhone = phoneEl.href ? phoneEl.href.replace("tel:", "") : phoneEl.innerText;
        phone = (rawPhone || "").trim();
      } else {
        const sections = modal.querySelectorAll("section");
        for (const sec of sections) {
          const header = sec.querySelector("h3");
          const headerText = header ? header.innerText.toLowerCase() : "";
          if (headerText.includes("phone") || headerText.includes("số điện thoại") || headerText.includes("điện thoại")) {
            const valEl = sec.querySelector("span, li, a");
            if (valEl) {
              phone = valEl.innerText.trim();
              break;
            }
          }
        }
      }
      
      const closeBtn = document.querySelector("button[aria-label='Đóng'], button[aria-label='Dismiss'], button[data-test-modal-close-btn], .artdeco-modal__dismiss");
      if (closeBtn) {
        closeBtn.click();
      } else {
        const backdrop = document.querySelector(".artdeco-modal-overlay");
        if (backdrop) backdrop.click();
      }
    }
    
    return { email, phone };
  } catch(e) { return { email: "", phone: "" }; }
}

/**
 * Hàm phân tích văn bản (text) quét được từ trang tìm kiếm (Search Results)
 * và trích xuất ra Tên, Chức vụ, Vị trí.
 */
function parseLeadFromText(raw, linkedin_url) {
  const lines = raw.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  if (!lines.length) return null;

  // Tên: trước dấu •
  const nameLine = lines[0] || "";
  const name = nameLine.includes("•") ? nameLine.split("•")[0].trim() : nameLine;
  if (!name || name.length < 2) return null;

  let position = "";
  let location = "";

  // Bỏ qua các dòng rác ban đầu (kết nối, hiring)
  let startIdx = 1;
  while (startIdx < lines.length) {
    const l = lines[startIdx].toLowerCase();
    if (l.includes("degree connection") || l.match(/^[123](st|nd|rd)$/) || l === "hiring" || l === "đang tuyển dụng" || l.includes("làm việc tại")) {
      startIdx++;
    } else {
      break;
    }
  }

  const remaining = lines.slice(startIdx);
  if (remaining.length > 0) {
    let headlineLine = remaining[0];
    let locationLine = remaining.length > 1 ? remaining[1] : "";
    
    // LinkedIn đôi khi chèn thêm 1 dòng "Chức vụ" ngắn gọn trước dòng Headline thực sự
    if (remaining.length > 1) {
      const isHeadline = remaining[1].includes("|") || remaining[1].includes("@") || remaining[1].toLowerCase().includes(" tại ") || remaining[1].toLowerCase().includes(" at ");
      if (isHeadline && remaining[1].length > remaining[0].length) {
        headlineLine = remaining[1];
        locationLine = remaining.length > 2 ? remaining[2] : "";
      }
    }
    
    position = headlineLine;
    location = locationLine;
  }

  if (location && location.length > 60) {
    location = "";
  }

  // Tinh chỉnh chức vụ nếu có dòng "Hiện tại:" rõ ràng
  for (const line of lines) {
    if (line.startsWith("Hiện tại:") || line.startsWith("Current:")) {
      const rest = line.replace(/^Hiện tại:\s*/, "").replace(/^Current:\s*/, "").trim();
      if (rest.includes("|")) {
        const parts = rest.split("|").map(p => p.trim());
        position = parts.slice(0, -1).join(" | ");
        if (parts.length === 1) position = parts[0];
      } else if (rest.includes(" tại ")) {
        position = rest.split(" tại ")[0].trim();
      } else if (rest.includes(" at ")) {
        position = rest.split(" at ")[0].trim();
      } else {
        position = rest;
      }
      break;
    }
  }

  // company để trống — sẽ lấy khi crawl profile với email
  return { name, position, company: "", location, email: "", linkedin_url };
}

/**
 * Hàm lặp qua tất cả kết quả hiển thị trên trang tìm kiếm (LinkedIn Search)
 * và thu thập thông tin của từng người.
 */
function extractSearchResults() {
  const results = [];
  const seen = new Set();
  const profileLinks = document.querySelectorAll("a[href*='/in/']");

  profileLinks.forEach(link => {
    const linkedin_url = normalizeUrl(link.href);
    if (!linkedin_url.includes("/in/")) return;
    if (seen.has(linkedin_url)) return;
    seen.add(linkedin_url);

    // Tìm thẻ bọc ngoài (container) chứa toàn bộ thông tin của người này
    // Các class như reusable-search__result-container hoặc entity-result thường chứa cả tên, chức danh và địa điểm
    const container = link.closest(".reusable-search__result-container, .entity-result, .search-result, li") || link;
    
    const raw = (container.innerText || "").trim();
    if (!raw || raw.length < 2) return;

    const lead = parseLeadFromText(raw, linkedin_url);
    if (lead) results.push(lead);
  });

  return results;
}

/**
 * Hàm gửi dữ liệu leads thu thập được (dạng JSON) lên Backend API.
 */
async function sendLeads(leads) {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(['jwt_token'], (res) => {
        if (chrome.runtime.lastError) {
          console.error("[LeadFinder] Extension đã reload — hãy refresh trang (F5)");
          resolve(null);
          return;
        }
        const token = res.jwt_token || "";
        chrome.runtime.sendMessage({
          action: "fetch_api",
          url: `${BACKEND_URL}api/leads`,
          options: {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": "Bearer " + token
            },
            body: JSON.stringify(leads)
          }
        }, (response) => {
          if (chrome.runtime.lastError || !response) {
            console.error("[LeadFinder] Backend unreachable or communication error");
            resolve(null);
            return;
          }
          if (!response.ok) {
            if (response.status === 401) {
              console.error("[LeadFinder] Unauthorized. Please login from the extension popup.");
            } else {
              console.error("[LeadFinder] Backend error:", response.error || response.status);
            }
            resolve(null);
            return;
          }
          resolve(response.data);
        });
      });
    } catch (e) {
      console.error("[LeadFinder] Extension context invalidated — hãy refresh trang (F5)");
      resolve(null);
    }
  });
}

/**
 * Lắng nghe thông điệp (messages) từ popup hoặc background script.
 * Ví dụ khi bấm nút trên popup, popup sẽ gửi message "crawl_profile" để kích hoạt code này.
 */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "crawl_profile") {
    (async () => {
      const lead = extractProfileFromPage();
      if (!lead.email || !lead.phone) {
        const contactInfo = await getContactDetailsFromContactInfo();
        if (contactInfo.email) lead.email = contactInfo.email;
        if (contactInfo.phone) lead.phone = contactInfo.phone;
      }
      const result = await sendLeads([lead]);
      sendResponse({ ok: true, lead, result });
    })();
    return true;
  }
  if (msg.action === "crawl_search") {
    let leads = extractSearchResults();
    // Giới hạn ngẫu nhiên từ 10 - 15 account
    const limit = Math.floor(Math.random() * 6) + 10;
    if (leads.length > limit) leads = leads.slice(0, limit);
    sendLeads(leads).then(result => sendResponse({ ok: true, count: leads.length, result }));
    return true;
  }
  if (msg.action === "ping") {
    sendResponse({ ok: true, url: window.location.href });
    return true;
  }
  if (msg.action === "extract_profile_email") {
    (async () => {
      // Đợi trang render thẻ h1 (giảm vòng lặp xuống 15 để tránh dính throttle lâu)
      for (let i = 0; i < 15; i++) {
        if (document.querySelector("h1")) break;
        await new Promise(r => setTimeout(r, 400));
      }
      
      // Chờ thêm một chút để React JS hydrate
      await new Promise(r => setTimeout(r, 500));
      
      let lead = extractProfileFromPage();
      
      // Chỉ cuộn trang tìm #experience nếu company trống
      if (!lead.company || lead.company === "Chưa có") {
        let exp = document.getElementById("experience");
        if (exp) {
          exp.scrollIntoView({ block: "center" });
        } else {
          window.scrollTo(0, 2000);
        }
        await new Promise(r => setTimeout(r, 1000)); // Chờ 1000ms cho background tab
        
        window.scrollTo(0, 0);
        await new Promise(r => setTimeout(r, 500));
        
        // Thử lấy lại sau khi scroll
        lead = extractProfileFromPage();
      }
      const contactInfo = await getContactDetailsFromContactInfo();
      if (contactInfo.email) lead.email = contactInfo.email;
      if (contactInfo.phone) lead.phone = contactInfo.phone;
      sendResponse({ lead });
    })();
    return true;
  }
});

let isCrawling = false;

function injectStyles() {
  if (document.getElementById("lf-injected-styles")) return;
  const style = document.createElement("style");
  style.id = "lf-injected-styles";
  style.textContent = `
    .lf-floating-wrap {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 10px;
    }
    .lf-floating-btn {
      background: linear-gradient(135deg, #4f8ef7, #2dd4bf);
      color: #fff;
      border-radius: 50px;
      padding: 10px 18px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(79,142,247,0.4);
      display: flex;
      align-items: center;
      gap: 8px;
      user-select: none;
      transition: transform 0.2s ease, opacity 0.2s ease;
    }
    .lf-floating-btn:hover {
      transform: scale(1.03);
      opacity: 0.95;
    }
    .lf-floating-btn:active {
      transform: scale(0.97);
    }
    .lf-popover {
      display: none;
      width: 240px;
      background: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
      flex-direction: column;
      overflow: hidden;
      color: #f8fafc;
      font-size: 12px;
      text-align: left;
    }
    .lf-popover.visible {
      display: flex;
    }
    .lf-popover-item {
      padding: 12px 16px;
      cursor: pointer;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      transition: background 0.15s;
    }
    .lf-popover-item:hover {
      background: rgba(255,255,255,0.05);
    }
    .lf-popover-item:last-child {
      border-bottom: none;
    }
  `;
  document.head.appendChild(style);
}

function injectFloatingButton() {
  if (document.getElementById("lf-lk-wrap")) return;
  injectStyles();

  const wrap = document.createElement("div");
  wrap.id = "lf-lk-wrap";
  wrap.className = "lf-floating-wrap";
  
  const isProfile = window.location.href.includes("/in/");

  wrap.innerHTML = `
    ${!isProfile ? `
      <div class="lf-popover" id="lf-menu">
        <div style="padding:10px 14px 4px 14px; font-size:10px; color:#94a3b8; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Crawl LinkedIn Leads</div>
        <div class="lf-popover-item" id="lf-btn-basic" style="color:#e8eaf0;">
          ⚡ Crawl nhanh (không có email & company)
        </div>
        <div class="lf-popover-item" id="lf-btn-email" style="color:#4f8ef7; font-weight:600;">
          📧 Crawl đầy đủ (email + company, chậm)
        </div>
      </div>
    ` : ''}
    <div class="lf-floating-btn" id="lf-inner">
      🔍 ${isProfile ? "Crawl Profile" : "Crawl Search Leads"}
    </div>
  `;
  document.body.appendChild(wrap);

  const inner = document.getElementById("lf-inner");
  const menu = document.getElementById("lf-menu");

  inner.addEventListener("click", (e) => {
    e.stopPropagation();
    if (isCrawling) {
      isCrawling = false;
      inner.textContent = "🛑 Đang dừng...";
      return;
    }
    if (isProfile) {
      crawlProfile();
    } else {
      if (menu) menu.classList.toggle("visible");
    }
  });

  if (!isProfile) {
    document.getElementById("lf-btn-basic").addEventListener("click", async (e) => {
      e.stopPropagation();
      menu.classList.remove("visible");
      await crawlSearch(false);
    });

    document.getElementById("lf-btn-email").addEventListener("click", async (e) => {
      e.stopPropagation();
      menu.classList.remove("visible");
      await crawlSearch(true);
    });

    document.addEventListener("click", e => {
      if (!wrap.contains(e.target)) {
        if (menu) menu.classList.remove("visible");
      }
    });
  }
}

function getButtonLabel() {
  return window.location.href.includes("/in/") ? "🔍 Crawl Profile" : "🔍 Crawl Search Leads";
}

/**
 * Thực thi lệnh Crawl trên trang Profile cá nhân.
 * Cố gắng lấy thông tin cơ bản + Email, sau đó đẩy lên backend.
 */
async function crawlProfile() {
  isCrawling = true; // Cho phép bấm nút lần nữa để Dừng
  const inner = document.getElementById("lf-inner");
  inner.textContent = "⏳ Đang xử lý...";
  
  let lead = extractProfileFromPage();
  
  // Nếu đang ở trang phụ (ví dụ /details/) thì báo lỗi luôn và dừng
  if ((!lead.name || lead.name.length < 2) && window.location.href.split("/in/")[1]?.replace(/\/$/, "")?.includes("/")) {
    inner.textContent = "❌ Hãy về trang chính của Profile!";
    setTimeout(() => { inner.textContent = getButtonLabel(); isCrawling = false; }, 3500);
    return;
  }

  // Nếu tên chưa tải xong, chuyển trạng thái sang Chờ và lặp tối đa 30 giây
  if (!lead.name || lead.name.length < 2) {
    inner.textContent = "⏳ Đang chờ web load...";
  }
  
  let retries = 0;
  while ((!lead.name || lead.name.length < 2) && retries < 100) {
    if (!isCrawling) return; // Thoát ngay nếu người dùng bấm dừng
    await new Promise(r => setTimeout(r, 300));
    lead = extractProfileFromPage();
    retries++;
  }

  // Nếu chờ 30 giây vẫn thất bại
  if (!lead.name || lead.name.length < 2) {
    inner.textContent = "❌ Lỗi: Web load quá lâu!";
    setTimeout(() => { inner.textContent = getButtonLabel(); isCrawling = false; }, 3500);
    return;
  }

  inner.textContent = "⏳ Đang lấy contact...";
  if (!lead.email || !lead.phone) {
    const contactInfo = await getContactDetailsFromContactInfo();
    if (contactInfo.email) lead.email = contactInfo.email;
    if (contactInfo.phone) lead.phone = contactInfo.phone;
  }
  
  if (!isCrawling) return; // Kiểm tra lại lỡ user bấm dừng

  const result = await sendLeads([lead]);
  inner.textContent = result ? `✓ Đã lưu: ${lead.name}` : "❌ Backend offline";
  setTimeout(() => { inner.textContent = getButtonLabel(); isCrawling = false; }, 4000);
}

/**
 * Thực thi lệnh Crawl trên trang Tìm kiếm.
 * Nếu chọn withEmail = true, tool sẽ mở ngầm (background) từng profile để lấy email, do đó sẽ chậm hơn.
 */
async function crawlSearch(withEmail) {
  isCrawling = true;
  const inner = document.getElementById("lf-inner");
  let leads = extractSearchResults();

  // Giới hạn ngẫu nhiên từ 10 - 15 account
  const limit = Math.floor(Math.random() * 6) + 10;
  if (leads.length > limit) leads = leads.slice(0, limit);

  if (!withEmail) {
    inner.textContent = "⏳ Đang crawl...";
    const result = await sendLeads(leads);
    inner.textContent = result ? `✓ ${result.added} leads, ${result.duplicates} trùng` : "❌ Backend offline";
    setTimeout(() => { inner.textContent = getButtonLabel(); isCrawling = false; }, 2000);
    return;
  }

  // Crawl đầy đủ: mở từng profile lấy company + email
  for (let i = 0; i < leads.length; i++) {
    if (!isCrawling) {
      inner.textContent = `🛑 Đã dừng ở ${i}/${leads.length}`;
      setTimeout(() => { inner.textContent = getButtonLabel(); }, 3000);
      return;
    }
    
    const lead = leads[i];
    inner.innerHTML = `📧 ${i + 1}/${leads.length} — ${lead.name?.slice(0, 18) || "..."} <span style="margin-left:8px;background:#ef4444;padding:2px 6px;border-radius:10px;font-size:10px">Dừng</span>`;
    
    try {
      await new Promise((resolve) => {
        let settled = false;

        const done = (response) => {
          if (settled) return;
          settled = true;
          if (response?.lead) {
            if (response.lead.name && response.lead.name.length > 1) lead.name = response.lead.name;
            if (response.lead.email) lead.email = response.lead.email;
            if (response.lead.phone) lead.phone = response.lead.phone;
            if (response.lead.company && response.lead.company !== "Chưa có") 
              lead.company = response.lead.company;
            if (response.lead.position) lead.position = response.lead.position;
            if (response.lead.location) lead.location = response.lead.location;
          }
          resolve();
        };

        try {
          chrome.runtime.sendMessage(
            { action: "open_profile_get_email", url: lead.linkedin_url },
            done
          );
        } catch (e) {
          console.error("[LeadFinder] Extension context invalidated — hãy refresh trang (F5)");
          settled = true;
          resolve();
        }

        setTimeout(() => done(null), 35000); // Tăng lên 35s vì Chrome bóp băng thông tab ngầm
      });
    } catch(e) {}
    
    if (!isCrawling) break; // Check again after await
    await sendLeads([lead]);
    
    // Tăng thời gian chờ và ngẫu nhiên hóa (random delay từ 6 đến 12 giây)
    // nhằm giảm tải tần suất request dồn dập, hạn chế tối đa nguy cơ bị LinkedIn block tài khoản
    const crawlDelay = Math.floor(Math.random() * 6000) + 6000;
    await new Promise(r => setTimeout(r, crawlDelay));
  }

  isCrawling = false;
  inner.textContent = `✓ Xong ${leads.length} leads!`;
  setTimeout(() => { inner.textContent = getButtonLabel(); }, 5000);
}

// SPA URL watcher to dynamically inject/remove button when URL changes
let lastUrl = "";
setInterval(() => {
  const currentUrl = window.location.href;
  if (currentUrl === lastUrl) return;
  lastUrl = currentUrl;
  
  // Clean up existing button on URL change to re-initialize with new page context
  const btn = document.getElementById("lf-lk-wrap");
  if (btn) btn.remove();
  
  const shouldInject = (currentUrl.includes('/in/') || currentUrl.includes('/search/') || currentUrl.includes('/sales/')) && !currentUrl.includes('/search/results/content');
  
  if (shouldInject) {
    if (window.self === window.top) {
      injectFloatingButton();
    }
    const otherBtn = document.getElementById("lf-lkposts-wrap");
    if (otherBtn) otherBtn.remove();
  }
}, 1000);
})();
