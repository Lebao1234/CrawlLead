// content_fb.js — v7 — Fix noise "Facebook", author, virtualization
const BACKEND_URL = "https://crawllead.onrender.com";

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

  // ── Người đăng ─────────────────────────────────────────
  let author = "Unknown";
  
  // Trong group: cấu trúc thường là GroupName > AuthorName > Timestamp
  // Author nằm trong link profile, thường là <a> chứa <strong> hoặc text
  const authorNoise = ['chỉ báo', 'trạng thái', 'đang hoạt động', 'active', 'online', 
                        'facebook', 'group', 'nhóm', 'admin', 'quản trị', 'thành viên',
                        'member', 'just now', 'vừa xong', 'hôm qua', 'yesterday',
                        'bình luận', 'comment', 'chia sẻ', 'share', 'thích', 'like'];
  
  function isValidName(t) {
    if (t.length < 2 || t.length > 80) return false;
    const lower = t.toLowerCase();
    return !authorNoise.some(noise => lower.includes(noise));
  }

  const profileLinks = el.querySelectorAll('a[href*="/user/"], a[href*="/profile"], a[href*="facebook.com/"][role="link"]');
  for (const link of profileLinks) {
    const t = (link.textContent || "").trim();
    if (isValidName(t)) {
      author = t;
      break;
    }
  }
  
  // Fallback: lấy từ strong/heading
  if (author === "Unknown") {
    const candidates = el.querySelectorAll('strong span, h3 span, h4 span');
    const names = [];
    for (const c of candidates) {
      const t = (c.textContent || "").trim();
      if (isValidName(t)) {
        names.push(t);
      }
    }
    // Trong group post: tên đầu = group, tên thứ 2 = author
    if (names.length >= 2) {
      author = names[1];
    } else if (names.length === 1) {
      author = names[0];
    }
  }

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
    if (lower === groupName.toLowerCase()) continue;
    // Bỏ các label/badge Facebook
    if (fbLabels.some(l => lower === l || lower.startsWith(l))) continue;
    contentLines.push(line.trim());
  }

  const title = contentLines.length > 0 
    ? contentLines.join(' ').substring(0, 200)
    : cleanText.substring(0, 200);

  // ── URL bài đăng ───────────────────────────────────────
  let postUrl = "";
  const allLinks = el.querySelectorAll('a[href]');
  for (const a of allLinks) {
    const href = a.href || "";
    if (href.match(/\/(posts|permalink|videos)\/\d/)) {
      postUrl = href.split('?')[0];
      break;
    }
  }
  if (!postUrl) {
    for (const a of allLinks) {
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
    const textLower = cleanText.toLowerCase();
    const words = cleanKeyword.toLowerCase().split(/\s+/).filter(w => w.length > 1);
    const allMatch = words.every(w => textLower.includes(w));
    if (!allMatch) {
      console.log(`[LeadFinder] Post #${idx}: SKIP — thiếu từ: ${words.filter(w => !textLower.includes(w)).join(', ')}`);
      return null;
    }
  }

  console.log(`[LeadFinder] ✅ MATCH #${idx}: author="${author}" title="${title.substring(0, 60)}..."`);
  
  return {
    author,
    group_name: groupName,
    content_snippet: title,
    post_url: postUrl,
  };
}

function extractFacebookPosts(keyword = "") {
  const posts = [];
  
  let groupName = document.title.split('|')[0].trim();
  if (groupName === "Facebook" || !groupName) groupName = "Facebook Group";

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
      chrome.storage.local.get(['jwt_token'], async (res) => {
        if (chrome.runtime.lastError) {
          console.error("[LeadFinder] Extension đã reload — hãy refresh trang (F5)");
          resolve(null);
          return;
        }
        const token = res.jwt_token || "";
        try {
          const fetchRes = await fetch(`${BACKEND_URL}/api/facebook`, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": "Bearer " + token
            },
            body: JSON.stringify(posts)
          });
          if (fetchRes.status === 401) {
            console.error("[LeadFinder] ❌ Unauthorized.");
            resolve(null);
            return;
          }
          resolve(await fetchRes.json());
        } catch (e) {
          console.error("[LeadFinder] ❌ Backend lỗi:", e);
          resolve(null);
        }
      });
    } catch (e) {
      console.error("[LeadFinder] Extension context invalidated — hãy refresh trang (F5)");
      resolve(null);
    }
  });
}

let isFbCrawling = false;

function injectFbFloatingButton() {
  if (document.getElementById("lf-fb-btn")) return;
  const wrap = document.createElement("div");
  wrap.id = "lf-fb-btn";
  wrap.innerHTML = `
    <div id="lf-fb-inner" style="
      position:fixed;bottom:24px;right:24px;z-index:99999;
      background:linear-gradient(135deg,#0668E1,#00A4FF);
      color:#fff;border-radius:50px;padding:10px 18px;
      font-family:sans-serif;font-size:13px;font-weight:600;
      cursor:pointer;box-shadow:0 4px 20px rgba(6,104,225,0.5);
      display:flex;align-items:center;gap:8px;user-select:none;">
      📘 Crawl FB v7
    </div>`;
  document.body.appendChild(wrap);

  const inner = document.getElementById("lf-fb-inner");
  console.log("[LeadFinder] ✅ Button injected!");

  inner.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (isFbCrawling) return;

    const url = window.location.href;
    const isSinglePost = /\/(posts|permalink|videos)\/\d/.test(url);

    if (isSinglePost) {
      isFbCrawling = true;
      inner.textContent = "⏳ Trích xuất bài...";

      setTimeout(async () => {
        const posts = extractFacebookPosts("");
        if (posts.length === 0) {
          inner.textContent = "❌ Không lấy được bài — F12";
        } else {
          inner.textContent = `⏳ Gửi ${posts.length} bài...`;
          const result = await sendFbPosts(posts);
          inner.textContent = result 
            ? `✅ Lưu ${result.added}! (Trùng: ${result.duplicates})`
            : "❌ Lỗi Backend!";
        }
        setTimeout(() => { inner.textContent = "📘 Crawl FB v7"; isFbCrawling = false; }, 6000);
      }, 1500);

    } else {
      // ═══ CHẾ ĐỘ GROUP/FEED — Cuộn từng bước, extract mỗi bước ═══
      const keyword = prompt("Nhập từ khóa (để trống = lấy tất cả):", "");
      if (keyword === null) return;
      
      isFbCrawling = true;
      const allPosts = [];
      const seenUrls = new Set();
      let step = 0;
      const maxSteps = 6;

      inner.textContent = "⏳ Bắt đầu crawl...";

      const crawlStep = async () => {
        step++;
        inner.textContent = `⏳ Bước ${step}/${maxSteps} — Đang quét...`;

        // Extract bài đang hiển thị
        const posts = extractFacebookPosts(keyword);
        let newCount = 0;
        for (const p of posts) {
          if (!seenUrls.has(p.post_url)) {
            seenUrls.add(p.post_url);
            allPosts.push(p);
            newCount++;
          }
        }
        
        console.log(`[LeadFinder] Bước ${step}: +${newCount} mới, tổng ${allPosts.length}`);
        inner.textContent = `⏳ Bước ${step}/${maxSteps} — Tổng: ${allPosts.length} bài`;

        if (step < maxSteps) {
          // Cuộn xuống để load thêm bài
          window.scrollBy(0, 1200);
          // Đợi Facebook render bài mới
          setTimeout(crawlStep, 3000);
        } else {
          // Xong — gửi lên server
          if (allPosts.length === 0) {
            const kw = (keyword || "").replace(/^['"""'']+|['"""'']+$/g, '').trim();
            inner.textContent = kw
              ? `❌ 0 bài chứa "${kw}"`
              : "❌ Không tìm thấy bài nào";
          } else {
            inner.textContent = `⏳ Gửi ${allPosts.length} bài lên server...`;
            const result = await sendFbPosts(allPosts);
            inner.textContent = result
              ? `✅ Lưu ${result.added} bài! (Trùng: ${result.duplicates})`
              : "❌ Lỗi Backend!";
          }
          setTimeout(() => { inner.textContent = "📘 Crawl FB v7"; isFbCrawling = false; }, 8000);
        }
      };

      crawlStep();
    }
  });
}

if (window.location.hostname.includes("facebook.com")) {
  console.log("[LeadFinder] ✅ content_fb.js VERSION 7 loaded!");
  injectFbFloatingButton();
}
