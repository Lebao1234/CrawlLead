// content_fb.js — v7 — Fix noise "Facebook", author, virtualization
(function() {
const BACKEND_URL = CONFIG.API_URL + "/";

function getFacebookCleanText(el) {
  if (!el) return "";
  
  // 1. Try aria-label first (for FB links/buttons, it contains the clean text)
  let text = el.getAttribute("aria-label");
  if (text) {
    text = text.trim();
    if (text.length > 0) return text;
  }
  
  // 2. Try innerText (rendering-aware, ignores display:none elements)
  text = (el.innerText || "").trim();
  if (text) return text;
  
  // 3. Fallback to textContent
  return (el.textContent || "").trim();
}

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



function extractFromFeedItem(el, groupName, cleanKeyword, idx) {
  // Lấy text, lọc bỏ noise "Facebook" lặp lại từ icon/logo
  let rawText = (el.innerText || el.textContent || "").trim();
  
  // ── CẮT TEXT TRƯỚC PHẦN REACTIONS/COMMENTS ──
  // Tìm vị trí cắt sớm nhất
  const cutoffPatterns = [
    /\nTất cả cảm xúc[:\n]/i,
    /\nAll reactions?\n/i,
    /\n\d+\s*bình luận/i,
    /\n\d+\s*comments?\n/i,
    /\n\d+\s*lượt chia sẻ/i,
    /\nThích\nBình luận/i,
    /\nLike\nComment/i,
    /\nBình luận dưới tên/i,
    /\nViết bình luận/i,
  ];
  
  let cutPos = rawText.length;
  for (const pattern of cutoffPatterns) {
    const match = rawText.match(pattern);
    if (match && match.index < cutPos) {
      cutPos = match.index;
    }
  }
  rawText = rawText.substring(0, cutPos).trim();
  
  // Lọc bỏ dòng chỉ chứa "Facebook" hoặc quá ngắn
  const lines = rawText.split('\n');
  const cleanLines = lines.filter(line => {
    const t = line.trim();
    if (!t) return false;
    if (t === "Facebook") return false;
    if (t.length < 3) return false;
    return true;
  });
  
  const cleanText = cleanLines.join('\n').trim();
  
  if (cleanText.length < 10) {
    return null;
  }

  console.log(`[LeadFinder] Post #${idx}: ${cleanText.length} chars (raw ${rawText.length})`);
  console.log(`[LeadFinder] Clean text: "${cleanText.substring(0, 200)}..."`);

  // ── Người đăng & Nhóm ─────────────────────────────────────────
  let author = "Unknown";
  let extractedGroup = "";
  let isAnonymous = false;

  const headingEl = el.querySelector('h2, h3, h4, [role="heading"]');

  // Detect anonymous post from heading or first few lines of text
  if (headingEl) {
    const headingText = (headingEl.innerText || headingEl.textContent || "").trim();
    const headingLower = headingText.toLowerCase();
    if (headingLower.includes("người tham gia ẩn danh") || 
        headingLower.includes("anonymous member") || 
        headingLower.includes("anonymous participant") ||
        headingLower.includes("thành viên ẩn danh") ||
        headingLower.includes("người dùng facebook") ||
        headingLower.includes("facebook user")) {
      isAnonymous = true;
      author = "Người tham gia ẩn danh";
    }
  }

  if (!isAnonymous) {
    for (let i = 0; i < Math.min(cleanLines.length, 3); i++) {
      const lineLower = cleanLines[i].toLowerCase();
      if (lineLower.includes("người tham gia ẩn danh") || 
          lineLower.includes("anonymous member") || 
          lineLower.includes("anonymous participant") ||
          lineLower.includes("thành viên ẩn danh") ||
          lineLower.includes("người dùng facebook") ||
          lineLower.includes("facebook user")) {
        isAnonymous = true;
        author = "Người tham gia ẩn danh";
        break;
      }
    }
  }

  // Only query links from headingEl to avoid pulling commenter links from comment sections.
  // Fall back to first 3 links in the post container if headingEl is not found.
  const headerLinks = headingEl 
    ? Array.from(headingEl.querySelectorAll('a[href]')) 
    : Array.from(el.querySelectorAll('a[href]')).slice(0, 3);
  
  const linkCandidates = [];
  
  function isValidName(t) {
    if (t.length < 2 || t.length > 80) return false;
    const lower = t.toLowerCase();
    const authorNoise = ['chỉ báo', 'trạng thái', 'đang hoạt động', 'active', 'online', 
                          'facebook', 'group', 'nhóm', 'admin', 'quản trị', 'thành viên',
                          'member', 'just now', 'vừa xong', 'hôm qua', 'yesterday',
                          'bình luận', 'comment', 'chia sẻ', 'share', 'thích', 'like', 'tin tuyển dụng'];
    return !authorNoise.some(noise => lower.includes(noise));
  }

  for (const a of headerLinks) {
    const href = a.href || "";
    const text = getFacebookCleanText(a);
    if (!text || text.length < 2) continue;

    const lowerText = text.toLowerCase();
    if (lowerText === "facebook" || lowerText === "nhóm" || lowerText === "group") continue;

    try {
      const urlObj = new URL(href);
      const path = urlObj.pathname;
      const parts = path.split('/').filter(Boolean);

      // 1. Check group link: /groups/group_id/
      if (parts[0] === 'groups' && parts.length === 2) {
        extractedGroup = text;
        continue;
      }

      // 2. Check user link inside group: /groups/group_id/user/user_id/
      if (parts[0] === 'groups' && parts.length === 4 && parts[2] === 'user') {
        if (isValidName(text)) linkCandidates.push({ type: 'user', text });
        continue;
      }

      // 3. Check general user link
      if (href.includes('profile.php') || (!href.includes('/groups/') && !href.includes('/posts/') && !href.includes('/permalink/') && parts.length === 1)) {
        if (isValidName(text)) linkCandidates.push({ type: 'user', text });
        continue;
      }
      
      if (isValidName(text)) linkCandidates.push({ type: 'unknown', text });
    } catch (err) {
      if (isValidName(text)) linkCandidates.push({ type: 'unknown', text });
    }
  }

  const users = linkCandidates.filter(c => c.type === 'user');
  if (users.length > 0 && author === "Unknown") {
    author = users[0].text;
  }

  // Fallback if URL analysis didn't extract names
  if (author === "Unknown" || !extractedGroup) {
    const textCandidates = [];
    const elements = headingEl 
      ? headingEl.querySelectorAll('strong span, h2 span, h3 span, h4 span, a') 
      : Array.from(el.querySelectorAll('strong span, h3 span, h4 span, a')).slice(0, 5);

    for (const elCandidate of elements) {
      const t = getFacebookCleanText(elCandidate);
      if (isValidName(t) && !textCandidates.includes(t)) {
        if (t.length < 50) {
          textCandidates.push(t);
        }
      }
    }

    if (textCandidates.length >= 2) {
      if (author === "Unknown") author = textCandidates[0];
      if (!extractedGroup) extractedGroup = textCandidates[1];
    } else if (textCandidates.length === 1) {
      if (author === "Unknown") author = textCandidates[0];
    }
  }

  const isGroupPage = window.location.href.includes("/groups/") && !window.location.href.includes("/posts/") && !window.location.href.includes("/permalink/");
  const finalGroupName = (isGroupPage ? groupName : extractedGroup) || groupName;

  // Fallback: detect anonymous/badge text as author from content
  const fbLabels = ['người tham gia ẩn danh', 'người đóng góp đang lên', 
                     'theo dõi', 'tham gia', 'top contributor', 'rising contributor',
                     'sắp xếp bảng feed'];
  if (author === "Unknown") {
    for (const line of cleanLines) {
      const lower = line.trim().toLowerCase();
      if (lower === 'người tham gia ẩn danh') {
        author = "Người tham gia ẩn danh";
        break;
      }
    }
  }

  // ── Nội dung ───────────────────────────────────────────
  const noiseWords = ['thích', 'bình luận', 'chia sẻ', 'like', 'comment', 'share',
                      'trả lời', 'xem thêm', 'see more', 'phù hợp nhất', 'mới nhất',
                      'viết bình luận', 'gửi', 'hôm qua', 'reply', 'facebook',
                      'bình luận dưới tên', 'tất cả bình luận', 'tất cả cảm xúc',
                      'người khác', 'và ', 'ib ', 'inbox', 'zalo', 'liên hệ',
                      'phản hồi', 'đã trả lời', 'đã bình luận'];

  // Regex patterns cho noise
  const noisePatterns = [
    /^\d+$/,                                          // Chỉ số (reactions)
    /^\d+\s*(giờ|phút|ngày|tuần|tháng|giây)/i,       // Thời gian
    /^\d+\s*(bình luận|lượt|người)/i,                 // Đếm
    /^tất cả cảm xúc/i,                               // Reactions header
    /người khác$/i,                                    // "và 57 người khác"
    /^và \d+/i,                                        // "và 57..."
    /ib nhận/i,                                        // Comment noise
    /^zl\s*\d/i,                                       // Số Zalo
    /^\d{3,}/,                                         // Số điện thoại
    /^gửi$/i,
  ];

  let contentLines = [];
  let hitReactionSection = false;
  
  for (const line of cleanLines) {
    const lower = line.trim().toLowerCase();
    if (lower.length < 4) continue;
    
    // Khi gặp "Tất cả cảm xúc" → đánh dấu đã vào phần reactions/comments → bỏ hết phía sau
    if (lower.startsWith('tất cả cảm xúc') || lower.startsWith('all reactions')) {
      hitReactionSection = true;
      continue;
    }
    if (hitReactionSection) continue; // Bỏ mọi dòng sau phần reactions
    
    if (noiseWords.some(n => lower.startsWith(n) || lower === n)) continue;
    if (noisePatterns.some(p => p.test(lower))) continue;
    // Bỏ dòng trùng author hoặc group
    if (lower === author.toLowerCase()) continue;
    if (lower === finalGroupName.toLowerCase() || (groupName && lower === groupName.toLowerCase())) continue;
    // Bỏ các label/badge Facebook
    if (fbLabels.some(l => lower === l || lower.startsWith(l))) continue;
    contentLines.push(line.trim());
  }

  const title = contentLines.length > 0 
    ? contentLines.join(' ').substring(0, 200)
    : cleanText.substring(0, 200);

  // ── URL bài đăng ───────────────────────────────────────
  let postUrl = "";
  const postLinks = el.querySelectorAll('a[href]');
  for (const a of postLinks) {
    const href = a.href || "";
    if (href.match(/\/(posts|permalink|videos)\/\d/)) {
      postUrl = href.split('?')[0];
      break;
    }
  }
  if (!postUrl) {
    for (const a of postLinks) {
      const href = a.href || "";
      if (href.includes("facebook.com") && href.match(/\/\d{10,}/)) {
        postUrl = href.split('?')[0];
        break;
      }
    }
  }
  if (!postUrl) postUrl = window.location.href + "#post-" + idx;

  // ── Lọc keyword (AND logic: tất cả từ phải xuất hiện, không cần liền nhau) ──
  if (cleanKeyword) {
    if (!matchesKeyword(cleanText, cleanKeyword)) {
      console.log(`[LeadFinder] Post #${idx}: SKIP — không khớp từ khóa: "${cleanKeyword}"`);
      return null;
    }
  }

  console.log(`[LeadFinder] ✅ MATCH #${idx}: author="${author}" title="${title.substring(0, 60)}..."`);
  
  return {
    author,
    group_name: finalGroupName,
    content_snippet: title,
    post_url: postUrl,
  };
}

function extractFacebookPosts(keyword = "") {
  const posts = [];
  
  let groupName = "Facebook Group";
  const titleParts = document.title.split('|').map(t => t.trim());
  if (titleParts.length > 0) {
    for (const part of titleParts) {
      const p = part.replace(/^\(\d+\+?\)\s*/, "").trim();
      if (p && p.toLowerCase() !== "facebook" && !p.toLowerCase().includes("search results") && !p.toLowerCase().includes("kết quả tìm kiếm")) {
        groupName = p;
        break;
      }
    }
  }

  let cleanKeyword = keyword.replace(/^['"""'']+|['"""'']+$/g, '').trim();

  console.log(`[LeadFinder] ═══════════════════════════════════════`);
  console.log(`[LeadFinder] Group: "${groupName}" | Keyword: "${cleanKeyword || '(tất cả)'}"`);

  // Tìm feed container
  const feed = document.querySelector('div[role="feed"]');
  if (!feed) {
    console.log(`[LeadFinder] ❌ Không tìm thấy div[role="feed"]`);
    return posts;
  }

  const children = feed.children;
  console.log(`[LeadFinder] Feed: ${children.length} children`);

  let processed = 0;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    
    // Bỏ loading placeholder
    if (child.querySelector('[data-visualcompletion="loading-state"]')) continue;
    
    // Bỏ element rỗng (virtualized)
    const text = (child.innerText || child.textContent || "").trim();
    if (text.length < 30) continue;
    // Bỏ element toàn "Facebook"
    if (text.replace(/Facebook/g, '').replace(/\s/g, '').length < 20) continue;

    const post = extractFromFeedItem(child, groupName, cleanKeyword, i);
    if (post) {
      posts.push(post);
    }
    processed++;
  }

  console.log(`[LeadFinder] ═══════════════════════════════════════`);
  console.log(`[LeadFinder] 🏁 ${posts.length} bài match / ${processed} processed / ${children.length} total`);
  console.log(`[LeadFinder] ═══════════════════════════════════════`);
  return posts.slice(0, 20);
}

async function sendFbPosts(posts) {
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
          url: `${BACKEND_URL}api/facebook`,
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

let isFbCrawling = false;

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
      background: linear-gradient(135deg, #0668E1, #00A4FF);
      color: #fff;
      border-radius: 50px;
      padding: 10px 18px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(6,104,225,0.4);
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
      border-color: #00a4ff;
    }
    .lf-action-btn {
      background: #0668E1;
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
      background: #0056b3;
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
      border-top-color: #3b82f6;
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

async function runFbCrawl(keyword, steps, isSinglePost, sendResponse = null) {
  if (isFbCrawling) {
    if (sendResponse) sendResponse({ ok: false, error: "Crawl already in progress." });
    return;
  }

  isFbCrawling = true;

  if (isSinglePost) {
    showToast("⏳ Trích xuất bài đăng...", true);
    setTimeout(async () => {
      const posts = extractFacebookPosts("");
      if (posts.length === 0) {
        showToast("❌ Không lấy được bài đăng nào.", false);
        hideToast(4000);
        if (sendResponse) sendResponse({ ok: false, error: "No posts found." });
      } else {
        showToast(`⏳ Gửi ${posts.length} bài lên server...`, true);
        const result = await sendFbPosts(posts);
        if (result) {
          showToast(`✅ Thành công! Lưu ${result.added} bài (Trùng: ${result.duplicates})`, false);
          hideToast(5000);
          if (sendResponse) sendResponse({ ok: true, result });
        } else {
          showToast("❌ Gửi thất bại. Lỗi kết nối Backend.", false);
          hideToast(4000);
          if (sendResponse) sendResponse({ ok: false, error: "Backend offline/error." });
        }
      }
      isFbCrawling = false;
    }, 1500);
  } else {
    // Chế độ feed/group - cuộn từng bước
    const maxSteps = steps || 6;
    const allPosts = [];
    const seenUrls = new Set();
    let currentStep = 0;

    showToast("⏳ Bắt đầu thu thập bài đăng Facebook...", true);

    const runStep = async () => {
      currentStep++;
      showToast(`⏳ Quét bước ${currentStep}/${maxSteps} — Tổng: ${allPosts.length} bài`, true);

      const posts = extractFacebookPosts(keyword);
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
        window.scrollBy(0, 1200);
        setTimeout(runStep, 3000);
      } else {
        if (allPosts.length === 0) {
          const kw = keyword ? `chứa "${keyword}"` : "";
          showToast(`❌ Không tìm thấy bài đăng nào ${kw}`, false);
          hideToast(5000);
          if (sendResponse) sendResponse({ ok: true, count: 0, result: { added: 0, duplicates: 0 } });
        } else {
          showToast(`⏳ Đang lưu ${allPosts.length} bài đăng lên backend...`, true);
          const result = await sendFbPosts(allPosts);
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
        isFbCrawling = false;
      }
    };

    runStep();
  }
}

function injectFbFloatingButton() {
  if (document.getElementById("lf-fb-wrap")) return;
  injectStyles();

  const wrap = document.createElement("div");
  wrap.id = "lf-fb-wrap";
  wrap.className = "lf-floating-wrap";

  // Xác định loại URL
  const url = window.location.href;
  const isSinglePost = /\/(posts|permalink|videos)\/\d/.test(url);

  wrap.innerHTML = `
    <div class="lf-popover" id="lf-fb-popover">
      <div class="lf-popover-title">Crawl Facebook Posts</div>
      ${!isSinglePost ? `
        <div class="lf-input-group">
          <label class="lf-input-label" for="lf-fb-keyword">Keyword Filter</label>
          <input type="text" class="lf-input-field" id="lf-fb-keyword" placeholder="e.g. tuyển dụng (optional)">
        </div>
        <div class="lf-input-group">
          <label class="lf-input-label" for="lf-fb-steps">Auto-scroll depth</label>
          <select class="lf-input-field" id="lf-fb-steps" style="cursor:pointer;">
            <option value="3">3 scrolls (fast)</option>
            <option value="6" selected>6 scrolls (default)</option>
            <option value="12">12 scrolls (deep)</option>
          </select>
        </div>
      ` : `<div style="font-size:12px;color:#94a3b8;margin-bottom:6px;">Trích xuất nội dung từ bài đăng đơn lẻ này.</div>`}
      <button class="lf-action-btn" id="lf-fb-start-btn">Start Crawling</button>
    </div>
    <div class="lf-floating-btn" id="lf-fb-trigger-btn">
      📘 Crawl FB v7
    </div>
  `;
  document.body.appendChild(wrap);

  const triggerBtn = document.getElementById("lf-fb-trigger-btn");
  const popover = document.getElementById("lf-fb-popover");
  const startBtn = document.getElementById("lf-fb-start-btn");

  triggerBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (isFbCrawling) return;
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

    const keyword = document.getElementById("lf-fb-keyword")?.value.trim() || "";
    const steps = parseInt(document.getElementById("lf-fb-steps")?.value || "6", 10);

    runFbCrawl(keyword, steps, isSinglePost);
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
  const btn = document.getElementById("lf-fb-wrap");
  if (btn) btn.remove();
  
  if (currentUrl.includes("facebook.com")) {
    if (window.self === window.top) {
      injectFbFloatingButton();
    }
  }
}, 1000);
})();
