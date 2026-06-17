// content_lk_posts.js — Crawl LinkedIn Posts
(function() {
const BACKEND_URL = CONFIG.API_URL + "/";

function matchesKeyword(fullText, cleanKeyword) {
  if (!cleanKeyword) return true;
  const textLower = fullText.toLowerCase();
  const words = cleanKeyword.toLowerCase().split(/\s+/).filter(w => w.length > 1);
  return words.every(word => {
    if (textLower.includes(word)) return true;
    if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss") && !word.endsWith("us") && !word.endsWith("is") && !word.endsWith("as")) {
      const singular = word.slice(0, -1);
      if (textLower.includes(singular)) return true;
    }
    return false;
  });
}

/**
 * Trích xuất thông tin từ một bài đăng LinkedIn.
 * @param {Element} el - DOM element chứa bài đăng
 * @param {string} cleanKeyword - Từ khóa đã làm sạch (AND logic)
 * @param {number} idx - Index của bài đăng
 * @returns {object|null} - Thông tin bài đăng hoặc null nếu không match
 */
function extractFromLinkedInPost(el, cleanKeyword, idx) {
  try {
    // ── Lấy raw text ──
    let rawText = (el.innerText || el.textContent || "").trim();
    if (rawText.length < 20) return null;

    // ── CẮT TEXT TRƯỚC PHẦN REACTIONS/COMMENTS ──
    const cutoffPatterns = [
      /\nLike\nComment/i,
      /\nComment\nRepost/i,
      /\nRepost\nSend/i,
      /\nThích\nBình luận/i,
      /\nBình luận\nĐăng lại/i,
      /\nĐăng lại\nGửi/i,
      /\nLike\nComment\nRepost\nSend/i,
      /\nThích\nBình luận\nĐăng lại\nGửi/i,
      /\n\d+\s*reactions?/i,
      /\n\d+\s*comments?/i,
      /\n\d+\s*lượt thích/i,
      /\n\d+\s*bình luận/i,
    ];

    let cutPos = rawText.length;
    for (const pattern of cutoffPatterns) {
      const match = rawText.match(pattern);
      if (match && match.index < cutPos) {
        cutPos = match.index;
      }
    }
    rawText = rawText.substring(0, cutPos).trim();

    // ── Author name ──
    let author = "Unknown";
    try {
      const authorSelectors = [
        'span.update-components-actor__name span[aria-hidden="true"]',
        'a.update-components-actor__meta-link span[aria-hidden="true"]',
        '.update-components-actor__name span[aria-hidden="true"]',
        '.feed-shared-actor__name span[aria-hidden="true"]',
        'a.update-components-actor__meta-link',
      ];
      for (const sel of authorSelectors) {
        try {
          const authorEl = el.querySelector(sel);
          if (authorEl) {
            const t = (authorEl.innerText || authorEl.textContent || "").trim();
            if (t && t.length > 1 && t.length < 100) {
              author = t;
              break;
            }
          }
        } catch (e) {}
      }
    } catch (e) {
      console.log(`[LeadFinder] Post #${idx}: Error extracting author`, e);
    }

    // ── Author headline ──
    let author_headline = "";
    try {
      const headlineSelectors = [
        'span.update-components-actor__description span[aria-hidden="true"]',
        '.update-components-actor__description span[aria-hidden="true"]',
        '.feed-shared-actor__description span[aria-hidden="true"]',
      ];
      for (const sel of headlineSelectors) {
        try {
          const headlineEl = el.querySelector(sel);
          if (headlineEl) {
            const t = (headlineEl.innerText || headlineEl.textContent || "").trim();
            if (t && t.length > 1) {
              author_headline = t.substring(0, 200);
              break;
            }
          }
        } catch (e) {}
      }
    } catch (e) {
      console.log(`[LeadFinder] Post #${idx}: Error extracting headline`, e);
    }

    // ── Nội dung bài đăng (content_snippet) ──
    let content_snippet = "";
    try {
      const contentSelectors = [
        'div.update-components-text span.break-words',
        'div.feed-shared-text span[dir="ltr"]',
        'div.update-components-text div[dir="ltr"]',
        'div.update-components-text',
        'div.feed-shared-text',
        '.feed-shared-update-v2__description',
      ];
      for (const sel of contentSelectors) {
        try {
          const contentEl = el.querySelector(sel);
          if (contentEl) {
            const t = (contentEl.innerText || contentEl.textContent || "").trim();
            if (t && t.length > 5) {
              content_snippet = t.substring(0, 500);
              break;
            }
          }
        } catch (e) {}
      }
    } catch (e) {
      console.log(`[LeadFinder] Post #${idx}: Error extracting content`, e);
    }

    // Fallback: dùng rawText nếu không lấy được content riêng
    if (!content_snippet && rawText.length > 20) {
      content_snippet = rawText.substring(0, 500);
    }

    // ── Post URL (từ data-urn hoặc link) ──
    let post_url = "";
    try {
      // Ưu tiên data-urn attribute
      const urn = el.getAttribute("data-urn") || "";
      if (urn && urn.includes("activity")) {
        post_url = `https://www.linkedin.com/feed/update/${urn}`;
      }

      // Fallback: tìm trong data-urn của container cha
      if (!post_url) {
        const parentWithUrn = el.closest("[data-urn]");
        if (parentWithUrn) {
          const parentUrn = parentWithUrn.getAttribute("data-urn") || "";
          if (parentUrn.includes("activity")) {
            post_url = `https://www.linkedin.com/feed/update/${parentUrn}`;
          }
        }
      }

      // Fallback: tìm link trong bài
      if (!post_url) {
        const allLinks = el.querySelectorAll('a[href*="/feed/update/urn"]');
        for (const a of allLinks) {
          const href = a.href || "";
          if (href.includes("/feed/update/")) {
            post_url = href.split("?")[0];
            break;
          }
        }
      }

      // Fallback cuối: tìm bất kỳ link nào chứa activity
      if (!post_url) {
        const actLinks = el.querySelectorAll('a[href*="activity"]');
        for (const a of actLinks) {
          const href = a.href || "";
          if (href.includes("linkedin.com") && href.includes("activity")) {
            post_url = href.split("?")[0];
            break;
          }
        }
      }
    } catch (e) {
      console.log(`[LeadFinder] Post #${idx}: Error extracting URL`, e);
    }
    if (!post_url) post_url = window.location.href + "#post-" + idx;

    // ── Post type detection ──
    let post_type = "text";
    try {
      if (el.querySelector("article-card, .feed-shared-article")) post_type = "article";
      else if (el.querySelector("video, .feed-shared-linkedin-video, .update-components-linkedin-video")) post_type = "video";
      else if (el.querySelector(".feed-shared-poll, .update-components-poll")) post_type = "poll";
      else if (el.querySelector(".feed-shared-mini-update-v2, .update-components-mini-update-v2")) post_type = "reshare";
      else if (el.querySelector("img.feed-shared-image__image, .update-components-image")) post_type = "image";
      else if (el.querySelector(".feed-shared-document, .update-components-document")) post_type = "document";
    } catch (e) {}

    // ── Reactions count ──
    let reactions_count = 0;
    try {
      const reactionsEl = el.querySelector("span.social-details-social-counts__reactions-count");
      if (reactionsEl) {
        const t = (reactionsEl.innerText || reactionsEl.textContent || "").trim().replace(/,/g, "").replace(/\./g, "");
        const parsed = parseInt(t, 10);
        if (!isNaN(parsed)) reactions_count = parsed;
      }
    } catch (e) {}

    // ── Comments count ──
    let comments_count = 0;
    try {
      // Tìm button chứa "comment" hoặc "bình luận"
      const commentBtns = el.querySelectorAll('button[aria-label*="comment"], button[aria-label*="Comment"], button[aria-label*="bình luận"], button[aria-label*="Bình luận"]');
      for (const btn of commentBtns) {
        const label = btn.getAttribute("aria-label") || "";
        const numMatch = label.match(/(\d[\d,\.]*)/);
        if (numMatch) {
          const parsed = parseInt(numMatch[1].replace(/,/g, "").replace(/\./g, ""), 10);
          if (!isNaN(parsed)) {
            comments_count = parsed;
            break;
          }
        }
      }
      // Fallback: tìm span chứa "comments" text
      if (comments_count === 0) {
        const countSpans = el.querySelectorAll("span.social-details-social-counts__comments-count, button.social-details-social-counts__comments-count");
        for (const span of countSpans) {
          const t = (span.innerText || span.textContent || "").trim().replace(/,/g, "").replace(/\./g, "");
          const parsed = parseInt(t, 10);
          if (!isNaN(parsed)) {
            comments_count = parsed;
            break;
          }
        }
      }
    } catch (e) {}

    // ── Lọc keyword (AND logic: tất cả từ phải xuất hiện) ──
    if (cleanKeyword) {
      const fullText = rawText + " " + content_snippet + " " + author + " " + author_headline;
      if (!matchesKeyword(fullText, cleanKeyword)) {
        console.log(`[LeadFinder] Post #${idx}: SKIP — không khớp từ khóa: "${cleanKeyword}"`);
        return null;
      }
    }

    console.log(`[LeadFinder] ✅ MATCH #${idx}: author="${author}" content="${content_snippet.substring(0, 60)}..."`);

    return {
      author,
      author_headline,
      content_snippet,
      post_url,
      post_type,
      reactions_count,
      comments_count,
    };
  } catch (e) {
    console.log(`[LeadFinder] Post #${idx}: Error extracting post`, e);
    return null;
  }
}

/**
 * Tìm tất cả các bài đăng LinkedIn trên trang và trích xuất thông tin.
 * @param {string} keyword - Từ khóa lọc
 * @returns {Array} - Danh sách bài đăng
 */
function extractLinkedInPosts(keyword = "") {
  const posts = [];

  let cleanKeyword = keyword.replace(/^['"""'']+|['"""'']+$/g, '').trim();

  console.log(`[LeadFinder] ═══════════════════════════════════════`);
  console.log(`[LeadFinder] LinkedIn Posts Crawl | Keyword: "${cleanKeyword || '(tất cả)'}"`);

  // Tìm post containers
  const containers = document.querySelectorAll('div.feed-shared-update-v2, div[data-urn*="activity"]');

  if (!containers || containers.length === 0) {
    console.log(`[LeadFinder] ❌ Không tìm thấy bài đăng nào trên trang`);
    return posts;
  }

  console.log(`[LeadFinder] Tìm thấy ${containers.length} post containers`);

  // Dedup by element reference to avoid processing duplicates from overlapping selectors
  const seen = new Set();
  const uniqueContainers = [];
  for (const c of containers) {
    if (!seen.has(c)) {
      seen.add(c);
      uniqueContainers.push(c);
    }
  }

  let processed = 0;
  for (let i = 0; i < uniqueContainers.length && posts.length < 20; i++) {
    const container = uniqueContainers[i];

    try {
      // Bỏ element quá ngắn
      const text = (container.innerText || container.textContent || "").trim();
      if (text.length < 30) continue;

      const post = extractFromLinkedInPost(container, cleanKeyword, i);
      if (post) {
        posts.push(post);
      }
      processed++;
    } catch (e) {
      console.log(`[LeadFinder] Post #${i}: Error processing container`, e);
    }
  }

  console.log(`[LeadFinder] ═══════════════════════════════════════`);
  console.log(`[LeadFinder] 🏁 ${posts.length} bài match / ${processed} processed / ${uniqueContainers.length} total`);
  console.log(`[LeadFinder] ═══════════════════════════════════════`);
  return posts.slice(0, 20);
}

/**
 * Gửi danh sách bài đăng LinkedIn lên backend.
 * @param {Array} posts - Danh sách bài đăng
 * @returns {Promise<object|null>} - Kết quả từ server
 */
async function sendLkPosts(posts) {
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
          url: `${BACKEND_URL}api/lk-posts`,
          options: {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer " + token
            },
            body: JSON.stringify(posts)
          }
        }, (response) => {
          if (chrome.runtime.lastError || !response) {
            console.error("[LeadFinder] Backend unreachable or communication error");
            resolve(null);
            return;
          }
          if (!response.ok) {
            if (response.status === 401) {
              console.error("[LeadFinder] ❌ Unauthorized.");
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

let isLkPostsCrawling = false;

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
      background: linear-gradient(135deg, #0A66C2, #004182);
      color: #fff;
      border-radius: 50px;
      padding: 10px 18px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(10,102,194,0.4);
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
      width: 260px;
      background: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 14px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
      flex-direction: column;
      gap: 10px;
      color: #f8fafc;
      text-align: left;
    }
    .lf-popover.visible {
      display: flex;
    }
    .lf-popover-title {
      font-size: 11px;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .lf-input-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .lf-input-label {
      font-size: 10px;
      color: #94a3b8;
      font-weight: 500;
    }
    .lf-input-field {
      width: 100%;
      padding: 8px 10px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      background: #0f172a;
      color: #f8fafc;
      font-size: 12px;
      outline: none;
      box-sizing: border-box;
    }
    .lf-input-field:focus {
      border-color: #0a66c2;
    }
    .lf-action-btn {
      background: #0A66C2;
      color: #fff;
      border: none;
      border-radius: 6px;
      padding: 9px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .lf-action-btn:hover {
      background: #004182;
    }
    .lf-toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      background: linear-gradient(135deg, #1e293b, #0f172a);
      color: #f8fafc;
      padding: 12px 20px;
      border-radius: 12px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      font-weight: 600;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      gap: 10px;
      transition: all 0.3s ease;
      opacity: 0;
      transform: translateY(20px);
      pointer-events: none;
    }
    .lf-toast.visible {
      opacity: 1;
      transform: translateY(0);
    }
    .lf-toast-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.2);
      border-top-color: #0a66c2;
      border-radius: 50%;
      animation: lf-spin 0.8s linear infinite;
    }
    @keyframes lf-spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

function showToast(message, showSpinner = false) {
  injectStyles();
  let toast = document.getElementById("lf-toast-widget");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "lf-toast-widget";
    toast.className = "lf-toast";
    document.body.appendChild(toast);
  }

  toast.innerHTML = '';
  if (showSpinner) {
    const spinner = document.createElement("div");
    spinner.className = "lf-toast-spinner";
    toast.appendChild(spinner);
  }
  
  const textNode = document.createElement("span");
  textNode.innerText = message;
  toast.appendChild(textNode);
  
  // Show it
  setTimeout(() => toast.classList.add("visible"), 50);
}

function hideToast(delay = 0) {
  const toast = document.getElementById("lf-toast-widget");
  if (!toast) return;
  setTimeout(() => {
    toast.classList.remove("visible");
  }, delay);
}

async function runLkPostsCrawl(keyword, steps, sendResponse = null) {
  if (isLkPostsCrawling) {
    if (sendResponse) sendResponse({ ok: false, error: "Crawl already in progress." });
    return;
  }
  
  isLkPostsCrawling = true;
  const maxSteps = steps || 5;
  const allPosts = [];
  const seenUrls = new Set();
  let currentStep = 0;

  showToast("⏳ Bắt đầu thu thập bài đăng LinkedIn...", true);

  const runStep = async () => {
    currentStep++;
    showToast(`⏳ Quét bước ${currentStep}/${maxSteps} — Tổng: ${allPosts.length} bài`, true);

    const posts = extractLinkedInPosts(keyword);
    let newCount = 0;
    for (const p of posts) {
      if (!seenUrls.has(p.post_url)) {
        seenUrls.add(p.post_url);
        allPosts.push(p);
        newCount++;
      }
    }
    
    console.log(`[LeadFinder] Bước ${currentStep}: +${newCount} mới, tổng ${allPosts.length}`);

    if (currentStep < maxSteps) {
      // Giả lập cuộn trang ngẫu nhiên từ 900px đến 1400px
      const scrollHeight = Math.floor(Math.random() * 500) + 900;
      window.scrollBy(0, scrollHeight);
      
      // Giả lập thời gian đọc/chờ ngẫu nhiên từ 3.5s đến 7.5s trước khi cuộn tiếp
      const readDelay = Math.floor(Math.random() * 4000) + 3500;
      setTimeout(runStep, readDelay);
    } else {
      if (allPosts.length === 0) {
        const kw = keyword ? `chứa "${keyword}"` : "";
        showToast(`❌ Không tìm thấy bài đăng nào ${kw}`, false);
        hideToast(5000);
        if (sendResponse) sendResponse({ ok: true, count: 0, result: { added: 0, duplicates: 0 } });
      } else {
        showToast(`⏳ Đang lưu ${allPosts.length} bài đăng lên backend...`, true);
        const result = await sendLkPosts(allPosts);
        if (result) {
          showToast(`✅ Hoàn thành! Lưu ${result.added} bài (Trùng: ${result.duplicates})`, false);
          hideToast(6000);
          if (sendResponse) sendResponse({ ok: true, result });
        } else {
          showToast("❌ Lưu thất bại. Backend không phản hồi.", false);
          hideToast(5000);
          if (sendResponse) sendResponse({ ok: false, error: "Backend offline/error." });
        }
      }
      isLkPostsCrawling = false;
    }
  };

  runStep();
}

function injectLkPostsFloatingButton() {
  const url = window.location.href;
  
  // KHÔNG inject trên profile, search hoặc sales (Trừ khi là tìm kiếm bài đăng results/content)
  if ((url.includes('/in/') || url.includes('/search/') || url.includes('/sales/')) && !url.includes('/search/results/content')) return;
  
  // Chỉ inject trên feed, recent-activity, posts hoặc tìm kiếm bài đăng results/content
  const isFeedPage = url.includes('/feed') || url.includes('/recent-activity') || url.includes('/posts') || url.includes('/search/results/content');
  if (!isFeedPage) return;

  if (document.getElementById("lf-lkposts-wrap")) return;
  injectStyles();

  const wrap = document.createElement("div");
  wrap.id = "lf-lkposts-wrap";
  wrap.className = "lf-floating-wrap";

  wrap.innerHTML = `
    <div class="lf-popover" id="lf-lkposts-popover">
      <div class="lf-popover-title">Crawl LinkedIn Posts</div>
      <div class="lf-input-group">
        <label class="lf-input-label" for="lf-lkposts-keyword">Keyword Filter</label>
        <input type="text" class="lf-input-field" id="lf-lkposts-keyword" placeholder="e.g. tuyển dụng (optional)">
      </div>
      <div class="lf-input-group">
        <label class="lf-input-label" for="lf-lkposts-steps">Auto-scroll depth</label>
        <select class="lf-input-field" id="lf-lkposts-steps" style="cursor:pointer;">
          <option value="3">3 scrolls (fast)</option>
          <option value="5" selected>5 scrolls (default)</option>
          <option value="10">10 scrolls (deep)</option>
        </select>
      </div>
      <button class="lf-action-btn" id="lf-lkposts-start-btn">Start Crawling</button>
    </div>
    <div class="lf-floating-btn" id="lf-lkposts-trigger-btn">
      📝 Crawl LK Posts
    </div>
  `;
  document.body.appendChild(wrap);

  const triggerBtn = document.getElementById("lf-lkposts-trigger-btn");
  const popover = document.getElementById("lf-lkposts-popover");
  const startBtn = document.getElementById("lf-lkposts-start-btn");

  triggerBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (isLkPostsCrawling) return;
    popover.classList.toggle("visible");
  });

  // Đóng khi click ngoài
  document.addEventListener("click", (e) => {
    if (!wrap.contains(e.target)) {
      popover.classList.remove("visible");
    }
  });

  startBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    popover.classList.remove("visible");

    const keyword = document.getElementById("lf-lkposts-keyword")?.value.trim() || "";
    const steps = parseInt(document.getElementById("lf-lkposts-steps")?.value || "5", 10);

    runLkPostsCrawl(keyword, steps);
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "ping") {
    sendResponse({ ok: true, url: window.location.href });
    return true;
  }
});

// SPA URL watcher to dynamically inject/remove button when URL changes
let lastUrl = "";
setInterval(() => {
  const currentUrl = window.location.href;
  if (currentUrl === lastUrl) return;
  lastUrl = currentUrl;
  
  // Clean up existing button on URL change to re-initialize with new page context
  const btn = document.getElementById("lf-lkposts-wrap");
  if (btn) btn.remove();
  
  const isFeedPage = currentUrl.includes('/feed') || currentUrl.includes('/recent-activity') || currentUrl.includes('/posts') || currentUrl.includes('/search/results/content');
  const shouldInject = isFeedPage && !((currentUrl.includes('/in/') || currentUrl.includes('/search/') || currentUrl.includes('/sales/')) && !currentUrl.includes('/search/results/content'));
  
  if (shouldInject) {
    if (window.self === window.top) {
      injectLkPostsFloatingButton();
    }
    const otherBtn = document.getElementById("lf-lk-wrap");
    if (otherBtn) otherBtn.remove();
  }
}, 1000);
})();
