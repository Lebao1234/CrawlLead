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

function getNameFromTitle() {
  try {
    let title = document.title || "";
    title = title.replace(/^\([\d+a-zA-Z\s]+\)\s+/, "").replace(/^\(\d+\)\s+/, "");
    const parts = title.split(/[|·\-–—]/);
    if (parts.length > 0) {
      const possibleName = parts[0].trim();
      if (possibleName && possibleName.toLowerCase() !== "linkedin" && possibleName.length > 1) {
        return possibleName;
      }
    }
  } catch (e) {
    console.error("[LeadFinder] Lỗi trích xuất tên từ tiêu đề:", e);
  }
  return "";
}

/**
 * Hàm lấy thông tin của một người dùng từ trang Profile LinkedIn (ví dụ: Tên, Chức vụ, Công ty...)
 * Hàm này dùng các selector HTML (CSS Selector) để bóc tách dữ liệu từ cấu trúc web LinkedIn.
 */
function extractProfileFromPage() {
  try {
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

    // === TÊN ===
    // Old LinkedIn: h1 với các class cũ
    let name = getText(
      "h1.text-heading-xlarge",
      "h1.inline",
      "h1[class*='heading']",
      ".pv-top-card--list li:first-child"
    );
    // New LinkedIn (2025+): h2 hoặc h1 bên trong <a href="/in/...">
    if (!name) {
      const nameEl = document.querySelector("a[href*='/in/'] h2")
        || document.querySelector("a[href*='/in/'] h1");
      if (nameEl) name = (nameEl.innerText || nameEl.textContent || "").trim();
    }
    // Fallback: h1/h2 trong main content (tránh lấy text từ nav header)
    if (!name) name = getText("main h1", "main h2");
    if (!name) name = getText("h1", "h2");
    // Validate: loại bỏ text rõ ràng không phải tên người
    if (name && name.match(/thông báo|notification|tin nhắn|messaging|trang chủ|home|việc làm|jobs|tìm kiếm|search/i)) {
      console.warn("[LeadFinder] Name bị nhầm nav text:", name);
      name = "";
    }

    // === CHỨC VỤ (Position) ===
    let position = getText(
      ".text-body-medium.break-words",
      "div[data-generated-suggestion-target]",
      ".pv-text-details__left-panel div.text-body-medium",
      ".ph5 .mt2 div.text-body-medium",
      "div.text-body-medium"
    );
    // New LinkedIn: <p> direct child của container chứa name element
    if (!position) {
      // Tìm heading (h2 hoặc h1) trong link profile hoặc trong main
      const nameEl = document.querySelector("a[href*='/in/'] h2")
        || document.querySelector("a[href*='/in/'] h1")
        || document.querySelector("main h1")
        || document.querySelector("h1");
      if (nameEl) {
        let container = nameEl;
        for (let i = 0; i < 10; i++) {
          container = container.parentElement;
          if (!container || container === document.body) break;
          const directPs = Array.from(container.children).filter(c => c.tagName === 'P');
          if (directPs.length >= 1) {
            for (const p of directPs) {
              const t = (p.innerText || p.textContent || "").trim();
              // Position: dài hơn 5 ký tự, không bắt đầu bằng "·", không phải location/connection text
              if (t.length > 5 && !t.startsWith("·") && !t.match(/^\d/) && !p.querySelector("a[href*='contact-info']")) {
                position = t;
                break;
              }
            }
            if (position) break;
          }
        }
      }
    }

    // === LOCATION ===
    let location = getText(
      ".pv-text-details__left-panel .text-body-small.inline.t-black--light.break-words",
      ".pv-text-details__left-panel span.text-body-small",
      "span.text-body-small.inline.t-black--light.break-words"
    );
    // New LinkedIn: <p> trong cùng div với link contact-info
    if (!location) {
      const contactLink = document.querySelector("a[href*='overlay/contact-info']");
      if (contactLink) {
        const row = contactLink.closest("div");
        if (row) {
          const pTags = row.querySelectorAll("p");
          for (const p of pTags) {
            const t = (p.innerText || p.textContent || "").trim();
            // Location: dài hơn 3 ký tự, không phải "·", không chứa link
            if (t.length > 3 && !t.startsWith("·") && !p.querySelector("a")) {
              location = t;
              break;
            }
          }
        }
      }
    }

    // === COMPANY ===
    let company = "";

    // Tầng 1a: New LinkedIn — div[role="button"] với svg[id*="company"]
    const roleButtons = document.querySelectorAll("div[role='button']");
    for (const btn of roleButtons) {
      // Bỏ qua nếu chứa school icon
      if (btn.querySelector("svg[id*='school']")) continue;
      // Chỉ lấy nếu chứa company icon hoặc company logo
      if (btn.querySelector("svg[id*='company']") || btn.querySelector("img[src*='company-logo']")) {
        const span = btn.querySelector("span");
        if (span) {
          const t = (span.innerText || span.textContent || "").trim();
          if (t.length > 1 && t.length < 100) {
            if (!t.match(/university|school|đại học|trường|academy|college/i)) {
              company = t;
              console.log("[LeadFinder] Company (new tầng 1a):", company);
              break;
            }
          }
        }
      }
    }

    // Tầng 1b: Old LinkedIn — .pv-text-details__right-panel
    if (!company) {
      const rightPanel = document.querySelector(".pv-text-details__right-panel");
      if (rightPanel) {
        const items = rightPanel.querySelectorAll("button, a, li");
        for (const el of items) {
          const label = (el.getAttribute("aria-label") || "").toLowerCase();
          const href = (el.getAttribute("href") || "").toLowerCase();
          if (label.match(/education|school|university/i) || href.includes("/school/")) continue;

          const lines = (el.innerText || el.textContent || "")
            .split("\n").map(l => l.trim()).filter(l => l.length > 1);
          const text = lines[0] || "";
          if (text.length < 2 || text.length > 100) continue;
          if (text.match(/university|school|đại học|trường|academy|college/i)) continue;

          company = text;
          console.log("[LeadFinder] Company (old tầng 1b):", company);
          break;
        }
      }
    }

    // Tầng 2: Experience section
    if (!company) {
      const expSection = document.querySelector("#experience");
      if (expSection) {
        const section = expSection.closest("section");
        const firstItem = section?.querySelector("ul > li");
        if (firstItem) {
          const spans = Array.from(firstItem.querySelectorAll("span[aria-hidden='true']"))
            .map(s => (s.innerText || s.textContent || "").trim())
            .filter(t => t.length > 1);

          console.log("[LeadFinder] Experience spans:", spans);

          if (spans.length >= 2) {
            const isDuration = spans[1].match(/(yr|mo|năm|tháng|year|month)/i);
            company = isDuration ? spans[0] : spans[1].split(" · ")[0];
          } else if (spans.length === 1) {
            company = spans[0];
          }
        }
      }
    }

    if (!company) company = "Chưa có";

    // Log tổng hợp để kiểm tra
    console.log("[LeadFinder] Extracted:", { name, position, company, location });

    let email = "";
    const emailEl = document.querySelector("a[href^='mailto:']");
    if (emailEl) email = emailEl.href.replace("mailto:", "").trim();

    let phone = "";
    const phoneEl = document.querySelector("a[href^='tel:']");
    if (phoneEl) phone = phoneEl.href.replace("tel:", "").trim();

    return {
      name, position, company, location, email, phone,
      linkedin_url: normalizeUrl(window.location.href)
    };
  } catch (e) {
    console.error("[LeadFinder] Lỗi extractProfileFromPage:", e);
    return {
      name: "", position: "", company: "Chưa có",
      location: "", email: "", phone: "",
      linkedin_url: normalizeUrl(window.location.href)
    };
  }
}

/**
 * Hàm mở phần "Contact Info" (Thông tin liên hệ) trên Profile LinkedIn để lấy email.
 * Vì email thường bị ẩn, hàm này giả lập thao tác click mở popup rồi quét text bên trong.
 */
async function getContactDetailsFromContactInfo() {
  const TIMEOUT = 12000; // Tối đa 12 giây, nếu quá thì bỏ qua

  const task = async () => {
    try {
      // Tìm nút Contact Info — mở rộng selector hơn
      let contactBtn = document.querySelector(
        "a[href*='overlay/contact-info'], a[id*='contact-info'], #topcard-contact-info"
      );
      if (!contactBtn) {
        const links = document.querySelectorAll("a, button");
        for (const el of links) {
          const text = (el.textContent || "").trim().toLowerCase();
          if (text === "contact info" || text === "thông tin liên hệ") {
            contactBtn = el;
            break;
          }
        }
      }

      // Không tìm thấy nút → trả về rỗng luôn, không treo
      if (!contactBtn) {
        console.warn("[LeadFinder] Không tìm thấy nút Contact Info");
        return { email: "", phone: "" };
      }

      let email = "";
      let phone = "";

      contactBtn.scrollIntoView({ block: "center" });
      const humanDelay = Math.floor(Math.random() * 1300) + 1200;
      await new Promise(r => setTimeout(r, humanDelay));
      contactBtn.click();

      // Chờ modal/overlay xuất hiện — ưu tiên modal/dialog cụ thể, tránh LazyColumn chung
      let modal = null;
      for (let i = 0; i < 20; i++) {
        // Ưu tiên 1: artdeco-modal hoặc dialog thực sự
        modal = document.querySelector(".artdeco-modal, [role='dialog']");
        if (modal && (modal.innerText || "").length > 50) break;
        // Ưu tiên 2: component contact info cụ thể
        modal = document.querySelector("[componentkey*='ContactInfoDetailSection']");
        if (modal && (modal.innerText || "").length > 50) break;
        modal = null;
        await new Promise(r => setTimeout(r, 300));
      }

      if (!modal) {
        // Fallback: nếu không tìm thấy modal nhưng URL đã đổi sang overlay, dùng document
        if (window.location.href.includes("overlay/contact-info")) {
          modal = document.body;
          console.log("[LeadFinder] Modal không tìm thấy, dùng document.body");
        } else {
          console.warn("[LeadFinder] Modal không xuất hiện");
          return { email: "", phone: "" };
        }
      }

      // Parse email
      try {
        const emailEl = modal.querySelector("a[href^='mailto:']");
        if (emailEl) {
          email = emailEl.href.replace("mailto:", "").trim();
        } else {
          // Old LinkedIn: tìm theo <section> + <h3>
          for (const sec of modal.querySelectorAll("section")) {
            const h = (sec.querySelector("h3")?.textContent || "").toLowerCase();
            if (h.includes("email") || h.includes("thư điện tử")) {
              email = (sec.querySelector("span, a, li")?.textContent || "").trim();
              break;
            }
          }
          // New LinkedIn: tìm theo svg icon email hoặc envelope
          if (!email) {
            const emailIcon = modal.querySelector("svg[id*='email'], svg[id*='envelope'], svg[id*='mail']");
            if (emailIcon) {
              const row = emailIcon.closest("div[componentkey]") || emailIcon.parentElement?.closest("div");
              if (row) {
                const link = row.querySelector("a");
                if (link) {
                  email = (link.innerText || link.textContent || "").trim();
                } else {
                  // Email có thể nằm trong <p>
                  const ps = row.querySelectorAll("p");
                  for (const p of ps) {
                    const val = (p.innerText || p.textContent || "").trim();
                    if (val.includes("@")) { email = val; break; }
                  }
                }
              }
            }
          }
          // New LinkedIn: tìm theo label <p> "Email"
          if (!email) {
            const allPs = modal.querySelectorAll("p");
            for (let pi = 0; pi < allPs.length; pi++) {
              const label = (allPs[pi].innerText || allPs[pi].textContent || "").trim().toLowerCase();
              if (label === "email" || label.includes("email")) {
                const nextP = allPs[pi + 1];
                if (nextP) {
                  const val = (nextP.innerText || nextP.textContent || "").trim();
                  if (val.includes("@")) { email = val; break; }
                }
                // Hoặc tìm <a> trong cùng container cha
                const parentRow = allPs[pi].closest("div");
                if (parentRow) {
                  const link = parentRow.querySelector("a");
                  if (link) {
                    const val = (link.innerText || link.textContent || "").trim();
                    if (val.includes("@")) { email = val; break; }
                  }
                }
              }
            }
          }
        }
      } catch (e) {}

      // Parse phone
      try {
        const phoneEl = modal.querySelector("a[href^='tel:']");
        if (phoneEl) {
          phone = phoneEl.href.replace("tel:", "").trim();
        } else {
          // Old LinkedIn: tìm theo <section> + <h3>
          for (const sec of modal.querySelectorAll("section")) {
            const h = (sec.querySelector("h3")?.textContent || "").toLowerCase();
            if (h.includes("phone") || h.includes("điện thoại")) {
              phone = (sec.querySelector("span, a, li")?.textContent || "").trim();
              break;
            }
          }
          // New LinkedIn: tìm theo svg icon phone/handset
          if (!phone) {
            const phoneIcon = modal.querySelector("svg[id*='phone'], svg[id*='handset'], svg[id*='call']");
            if (phoneIcon) {
              const row = phoneIcon.closest("div[componentkey]") || phoneIcon.parentElement?.closest("div");
              if (row) {
                // Tìm trong a, span, hoặc p
                const candidates = row.querySelectorAll("a[href^='tel:'], a, span, p");
                for (const el of candidates) {
                  const val = (el.innerText || el.textContent || "").trim();
                  if (val.match(/\d{6,}/)) {
                    phone = val.replace(/\s*\(.*\)\s*$/, "").trim(); // Bỏ "(Di động)" etc.
                    break;
                  }
                }
              }
            }
          }
          // New LinkedIn: tìm theo label <p> "Phone" / "Điện thoại"
          if (!phone) {
            const allPs = modal.querySelectorAll("p");
            for (let pi = 0; pi < allPs.length; pi++) {
              const label = (allPs[pi].innerText || allPs[pi].textContent || "").trim().toLowerCase();
              if (label.includes("phone") || label.includes("điện thoại")) {
                const nextP = allPs[pi + 1];
                if (nextP) {
                  const val = (nextP.innerText || nextP.textContent || "").trim();
                  if (val.match(/\d{6,}/)) {
                    phone = val.replace(/\s*\(.*\)\s*$/, "").trim();
                    break;
                  }
                }
              }
            }
          }
        }
      } catch (e) {}

      // Đóng modal — thử nhiều cách
      try {
        const closeBtn = document.querySelector(
          "button[aria-label='Đóng'], button[aria-label='Dismiss'], " +
          "button[aria-label='Close'], button[data-test-modal-close-btn], " +
          ".artdeco-modal__dismiss"
        );
        if (closeBtn) {
          closeBtn.click();
        } else {
          // Fallback: nhấn Escape
          document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        }
      } catch (e) {
        console.error("[LeadFinder] Không đóng được modal:", e);
      }

      await new Promise(r => setTimeout(r, 500)); // Chờ modal đóng xong
      return { email, phone };

    } catch (e) {
      console.error("[LeadFinder] Lỗi getContactDetailsFromContactInfo:", e);
      return { email: "", phone: "" };
    }
  };

  // Race giữa task thật và timeout — đảm bảo không bao giờ treo
  const timeout = new Promise(r => setTimeout(() => r({ email: "", phone: "" }), TIMEOUT));
  return Promise.race([task(), timeout]);
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
    let resolved = false;
    
    // Set a 15-second timeout to prevent hanging the UI
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.warn("[LeadFinder] sendLeads timed out after 15s");
        resolve(null);
      }
    }, 15000);

    const safeResolve = (val) => {
      clearTimeout(timer);
      if (!resolved) {
        resolved = true;
        resolve(val);
      }
    };

    try {
      // Guard: kiểm tra extension context còn sống không (bị invalidate khi extension reload)
      if (!chrome?.storage?.local || !chrome?.runtime?.sendMessage) {
        console.error("[LeadFinder] Extension context đã mất — hãy refresh trang (F5)");
        safeResolve(null);
        return;
      }

      chrome.storage.local.get(['jwt_token'], (res) => {
        try {
          if (chrome.runtime.lastError) {
            console.error("[LeadFinder] Extension đã reload — hãy refresh trang (F5)");
            safeResolve(null);
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
              safeResolve(null);
              return;
            }
            if (!response.ok) {
              if (response.status === 401) {
                console.error("[LeadFinder] Unauthorized. Please login from the extension popup.");
              } else {
                console.error("[LeadFinder] Backend error:", response.error || response.status);
              }
              safeResolve(null);
              return;
            }
            safeResolve(response.data);
          });
        } catch (innerErr) {
          console.error("[LeadFinder] Error inside storage callback of sendLeads:", innerErr);
          safeResolve(null);
        }
      });
    } catch (e) {
      console.error("[LeadFinder] Error starting sendLeads:", e);
      safeResolve(null);
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
      try {
        // Đợi trang render thẻ h1 hoặc h2 (LinkedIn mới dùng h2)
        for (let i = 0; i < 15; i++) {
          if (document.querySelector("h1, h2, a[href*='/in/'] h2")) break;
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
        
        if (!lead.name || lead.name.length < 2) {
          lead.name = getNameFromTitle();
        }
        
        sendResponse({ lead });
      } catch (e) {
        console.error("[LeadFinder] Lỗi trong extract_profile_email:", e);
        sendResponse({ lead: null });
      }
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
  
  try {
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

    // Nếu vẫn chưa có tên sau khi chờ, thử lấy từ tiêu đề tab làm fallback
    if (!lead.name || lead.name.length < 2) {
      lead.name = getNameFromTitle();
    }

    // Nếu chờ 30 giây vẫn thất bại
    if (!lead.name || lead.name.length < 2) {
      inner.textContent = "❌ Lỗi: Web load quá lâu!";
      setTimeout(() => { inner.textContent = getButtonLabel(); isCrawling = false; }, 3500);
      return;
    }

    // Nếu company trống, cuộn trang tìm #experience rồi thử lại (giống extract_profile_email)
    if (!lead.company || lead.company === "Chưa có") {
      inner.textContent = "⏳ Đang tìm company...";
      let exp = document.getElementById("experience");
      if (exp) {
        exp.scrollIntoView({ block: "center" });
      } else {
        window.scrollTo(0, 2000);
      }
      await new Promise(r => setTimeout(r, 1000));
      window.scrollTo(0, 0);
      await new Promise(r => setTimeout(r, 500));
      lead = extractProfileFromPage();
    }

    inner.textContent = "⏳ Đang lấy contact...";
    if (!lead.email || !lead.phone) {
      const contactInfo = await getContactDetailsFromContactInfo();
      if (contactInfo.email) lead.email = contactInfo.email;
      if (contactInfo.phone) lead.phone = contactInfo.phone;
    }
    
    if (!isCrawling) return; // Kiểm tra lại lỡ user bấm dừng

    inner.textContent = "⏳ Đang lưu dữ liệu...";
    const result = await sendLeads([lead]);

    // Đóng overlay contact-info nếu vẫn đang mở
    try {
      if (window.location.href.includes("overlay/contact-info")) {
        const closeBtn = document.querySelector(
          "button[aria-label='Đóng'], button[aria-label='Dismiss'], " +
          "button[aria-label='Close'], button[data-test-modal-close-btn], " +
          ".artdeco-modal__dismiss"
        );
        if (closeBtn) {
          closeBtn.click();
        } else {
          document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        }
        await new Promise(r => setTimeout(r, 400));
        // Nếu vẫn chưa đóng, dùng history.back()
        if (window.location.href.includes("overlay/contact-info")) {
          window.history.back();
          await new Promise(r => setTimeout(r, 400));
        }
      }
    } catch (e) {
      console.warn("[LeadFinder] Không đóng được overlay contact-info:", e);
    }

    inner.textContent = result ? `✓ Đã lưu: ${lead.name}` : "❌ Lỗi: Lưu thất bại!";
    setTimeout(() => { inner.textContent = getButtonLabel(); isCrawling = false; }, 4000);
  } catch (e) {
    console.error("[LeadFinder] Lỗi trong crawlProfile:", e);
    inner.textContent = "❌ Lỗi: Cào profile thất bại!";
    setTimeout(() => { inner.textContent = getButtonLabel(); isCrawling = false; }, 3500);
  }
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
