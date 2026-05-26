<div align="center">

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

## 📁 Cấu trúc dự án

```
leadfinder/
├── backend/                ← Flask API (Python)
│   ├── app.py
│   ├── requirements.txt
│   └── leads.json          ← tự tạo khi chạy
│
├── web-app/                ← Dashboard (HTML thuần)
│   └── index.html
│
└── extension/              ← Chrome Extension
    ├── manifest.json
    ├── content.js          ← inject vào LinkedIn
    ├── popup.html
    ├── popup.js
    └── background.js
```

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
