# 🔍 LeadFinder

**Tự động crawl leads từ LinkedIn — Chrome Extension + Flask API + Web Dashboard**
---

## ✨ Tính năng

- 🤖 **Auto-crawl** profiles LinkedIn chỉ với 1 click
- 📋 **Crawl hàng loạt** từ trang Search Results
- 📊 **Dashboard realtime** — tự cập nhật mỗi 5 giây
- 📤 **Export CSV** toàn bộ leads
- 🔍 **Duplicate detection** theo email + LinkedIn URL
- ✅ **Verify leads** trực tiếp trên dashboard
- 🐳 **Docker-ready** cho deploy production

---

## 🛠 Tech Stack

| Layer | Công nghệ |
|---|---|
| Chrome Extension | Vanilla JS |
| Backend | Python Flask + Gunicorn |
| Frontend | HTML / CSS / JS thuần |
| Deploy | Render (Full Stack) |

---

## 📁 Cấu trúc dự án & Giải thích code

Dưới đây là cấu trúc thư mục kèm theo giải thích chi tiết chức năng của từng file để bạn dễ dàng nắm bắt:

```text
leadfinder/
├── backend/                ← API Server xử lý dữ liệu (Python/Flask)
│   ├── app.py              ← (QUAN TRỌNG) File chính chứa toàn bộ logic API (thêm/sửa/xóa/lấy leads)
│   ├── requirements.txt    ← Danh sách thư viện Python cần cài đặt
│   └── leads.json          ← Nơi lưu trữ dữ liệu leads dạng JSON (Tự động sinh ra khi có data)
│
├── web-app/                ← Giao diện Dashboard quản lý leads
│   └── index.html          ← Trang giao diện chính, chứa cả HTML, CSS và JS để gọi API lên backend
│
└── extension/              ← Mã nguồn của Chrome Extension
    ├── manifest.json       ← File cấu hình bắt buộc của Extension (định nghĩa tên, quyền hạn, file chạy)
    ├── content.js          ← (QUAN TRỌNG) File được tiêm (inject) thẳng vào trang LinkedIn để quét và lấy HTML/data
    ├── popup.html          ← Giao diện hiển thị khi click vào icon extension trên trình duyệt
    ├── popup.js            ← Logic xử lý cho popup (ví dụ: bắt sự kiện click nút "Crawl")
    └── background.js       ← Chạy ngầm trong extension, lắng nghe và giao tiếp giữa content script và API
```

---

## 🧠 Hướng dẫn đọc hiểu code nhanh nhất

Để nhanh chóng hiểu luồng hoạt động của toàn bộ hệ thống, bạn hãy đọc code theo thứ tự sau:

### 1. Luồng Lấy Dữ Liệu (Extension)
*   **Bắt đầu từ `extension/content.js`**: Đây là trái tim của việc thu thập dữ liệu. Hãy xem cách các hàm tìm kiếm các selector HTML của LinkedIn (ví dụ: lấy tên, chức danh, công ty, link).
*   **Xem qua `extension/popup.js`**: File này chỉ đơn giản là gọi lệnh gửi thông điệp (message) đến `content.js` để yêu cầu bắt đầu crawl khi user bấm nút.
*   **Xem `extension/background.js` (nếu có logic gọi API)**: Thường extension sẽ lấy data từ `content.js`, sau đó `background.js` hoặc chính `content.js` sẽ gọi lệnh `fetch()` để gửi HTTP POST request chứa dữ liệu lên Backend.

### 2. Luồng Xử Lý Dữ Liệu (Backend)
*   **Mở `backend/app.py`**:
    *   Tìm route `POST /api/leads`: Đây là nơi nhận dữ liệu từ Extension gửi sang. Xem cách nó kiểm tra trùng lặp (duplicate) và lưu vào file `leads.json`.
    *   Tìm route `GET /api/leads`: Đây là nơi trả về danh sách leads cho Dashboard hiển thị.
    *   *Lưu ý:* Backend sử dụng danh sách/dictionary lưu trong bộ nhớ và ghi ra file `leads.json` để mô phỏng Database.

### 3. Luồng Hiển Thị Dữ Liệu (Web Dashboard)
*   **Mở `web-app/index.html`**:
    *   Cuộn xuống phần `<script>` ở cuối file (nếu JS viết chung, hoặc file JS riêng nếu có).
    *   Tìm hàm `fetchLeads()` hoặc các hàm gọi API: Bạn sẽ thấy nó gọi lệnh `fetch('http://localhost:5000/api/leads')` để lấy dữ liệu.
    *   Xem hàm `renderTable()` (hoặc hàm tương tự): Nhận dữ liệu JSON từ API và dùng vòng lặp để tạo các phần tử HTML (như `<tr>`, `<td>`) đưa vào bảng hiển thị.

**💡 Tóm tắt luồng dữ liệu (Data Flow):**
`LinkedIn (Trình duyệt)` ➡️ `content.js` (bóc tách HTML) ➡️ `Gửi POST API` ➡️ `app.py` (Lưu data vào `leads.json`) ➡️ `Dashboard gọi GET API` ➡️ `Hiển thị trên web-app`

---

## 🚀 Cài đặt & Chạy

### Bước 1 — Backend (Flask)

```bash
cd backend

# Tạo virtual environment
python -m venv venv
source venv/bin/activate        # Mac/Linux
# venv\Scripts\activate         # Windows

# Cài packages
pip install -r requirements.txt

# Chạy server
python app.py
```

> Server chạy tại: **http://localhost:5000**

---

### Bước 2 — Web Dashboard

Có 3 cách mở dashboard:

```bash
# Cách 1 — Double click
open web-app/index.html

# Cách 2 — Python simple server
cd web-app
python -m http.server 3000
# → Mở http://localhost:3000

# Cách 3 — VS Code Live Server extension (tự reload)
```

---

### Bước 3 — Chrome Extension

1. Mở Chrome → truy cập `chrome://extensions/`
2. Bật **Developer mode** (góc trên phải)
3. Nhấn **Load unpacked**
4. Chọn thư mục `extension/`
5. Icon **LeadFinder** xuất hiện trên toolbar ✅

---

### 🐳 Bước X — Docker (Dành cho Team / Server)

> Chạy toàn bộ stack 24/7 mà không cần cài Python thủ công.

```bash
# Đứng tại thư mục gốc của dự án
docker-compose up -d --build
```

| Service | URL |
|---|---|
| 🖥 Dashboard (Nginx) | http://localhost:3000 |
| ⚙️ Backend API (Gunicorn) | http://localhost:5000 |

> 💾 Dữ liệu `leads.json` được lưu vào **Docker Volume** — không mất khi tắt container.

---

## 🎯 Cách dùng Extension

**Crawl 1 profile:**
1. Vào trang LinkedIn của ai đó: `linkedin.com/in/username`
2. Nhấn icon LeadFinder → **"Crawl this page"**
3. Hoặc nhấn nút nổi ở góc phải màn hình

**Crawl danh sách (Search Results):**
1. Vào `linkedin.com/search/results/people/...`
2. Nhấn icon LeadFinder → **"Crawl this page"**
3. Tool tự động lấy tất cả profiles hiển thị trên trang

**Xem data:**
- Mở Dashboard → data tự cập nhật mỗi 5 giây
- Nhấn **Export CSV** để tải file

---

## 📡 API Endpoints

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/leads` | Lấy tất cả leads |
| `POST` | `/api/leads` | Thêm lead(s) mới |
| `DELETE` | `/api/leads/:id` | Xóa lead |
| `POST` | `/api/leads/:id/verify` | Verify lead |
| `POST` | `/api/leads/clear` | Xóa tất cả |
| `GET` | `/api/export/csv` | Download CSV |
| `GET` | `/api/stats` | Thống kê tổng quan |

---

## ⚠️ Lưu ý quan trọng

- **CORS**: Backend đã bật CORS cho tất cả origins (chỉ dùng ở dev)
- **LinkedIn rate limit**: Không crawl quá nhanh — tránh bị block tài khoản
- **Backup data**: Dữ liệu lưu trong `backend/leads.json`, nên backup thường xuyên
- **Duplicate detection**: Tự động phát hiện trùng theo email + LinkedIn URL

---

## 🔧 Troubleshooting

<details>
<summary><b>Extension không gửi được data</b></summary>

- Kiểm tra Flask đang chạy: http://localhost:5000/api/stats
- Mở Console của Extension (F12 trên popup) để xem lỗi
</details>

<details>
<summary><b>LinkedIn không cho crawl / data trống</b></summary>

- LinkedIn thay đổi HTML selectors thường xuyên
- Kiểm tra và cập nhật selectors trong `extension/content.js`
</details>

<details>
<summary><b>CORS error khi gọi API</b></summary>

```bash
pip install flask-cors
```

Đảm bảo `flask-cors` đã được cài và import đúng trong `app.py`.
</details>

---

## 📄 License

MIT © LeadFinder
