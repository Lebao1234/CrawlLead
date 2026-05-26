from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import json, csv, os, io
from datetime import datetime
import mimetypes

# Đảm bảo hệ thống nhận diện đúng định dạng file CSS và JS
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('application/javascript', '.js')

# Xác định đường dẫn tuyệt đối của thư mục chứa file app.py (thư mục backend)
base_dir = os.path.dirname(os.path.abspath(__file__))
# Lùi lại một cấp và vào thư mục web-app để trỏ tới thư mục chứa frontend
web_app_dir = os.path.join(base_dir, "..", "web-app")

# Khởi tạo ứng dụng Flask
# static_folder: Thư mục chứa file tĩnh (HTML, CSS, JS)
# static_url_path: Đường dẫn ảo để giấu đường dẫn thật
app = Flask(__name__, static_folder=web_app_dir, static_url_path="/static_assets_hidden")

# Bật CORS (Cross-Origin Resource Sharing)
# Cho phép Chrome Extension (chạy trên trang LinkedIn) gửi request API đến server Flask này
CORS(app)

# ==========================================
# PHẦN 1: PHỤC VỤ GIAO DIỆN WEB (FRONTEND)
# ==========================================

# Xử lý các request yêu cầu file tĩnh (như style.css, script.js)
@app.route("/<path:filename>")
def serve_static(filename):
    # Lấy đường dẫn thực tế của file trong thư mục web-app
    file_path = os.path.join(web_app_dir, filename)
    
    # Nếu file tồn tại thì trả về cho client
    if os.path.exists(file_path):
        mimetype = None
        # Thiết lập đúng kiểu dữ liệu (mimetype) để trình duyệt hiểu
        if filename.endswith(".css"):
            mimetype = "text/css"
        elif filename.endswith(".js"):
            mimetype = "application/javascript"
        # Trả về nội dung file
        return send_file(file_path, mimetype=mimetype)
    
    # Trả về mã lỗi 404 nếu không tìm thấy file
    return jsonify({"error": "Not found"}), 404

# Khi truy cập thư mục gốc "/", trả về file giao diện chính (index.html)
@app.route("/")
def index():
    return send_file(os.path.join(web_app_dir, "index.html"))

# ==========================================
# PHẦN 2: QUẢN LÝ DỮ LIỆU (DATABASE GIẢ LẬP BẰNG JSON)
# ==========================================

# Tên file dùng để lưu trữ dữ liệu leads
DATA_FILE = "leads.json"

# Hàm đọc dữ liệu từ file leads.json
def load_leads():
    # Nếu file chưa tồn tại (chưa có lead nào), trả về danh sách rỗng
    if not os.path.exists(DATA_FILE):
        return []
    # Mở file để đọc với mã hóa utf-8 để không bị lỗi tiếng Việt
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

# Hàm ghi toàn bộ dữ liệu danh sách leads đè lên file leads.json
def save_leads(leads):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        # Ghi dữ liệu JSON ra file, thụt lề 2 space cho dễ đọc, giữ nguyên ký tự tiếng Việt
        json.dump(leads, f, ensure_ascii=False, indent=2)

# ==========================================
# PHẦN 3: CÁC API ENDPOINTS XỬ LÝ DỮ LIỆU
# ==========================================

# API lấy danh sách toàn bộ leads
# Giao diện gọi API này bằng phương thức GET để hiển thị bảng dữ liệu
@app.route("/api/leads", methods=["GET"])
def get_leads():
    leads = load_leads() # Gọi hàm đọc file
    # Trả về kết quả dạng JSON bao gồm danh sách và tổng số lượng
    return jsonify({"leads": leads, "total": len(leads)})

# API thêm leads mới (khi Extension ấn nút Crawl)
# Gọi bằng phương thức POST và gửi dữ liệu body dạng JSON
@app.route("/api/leads", methods=["POST"])
def add_leads():
    data = request.json # Lấy dữ liệu gửi lên
    
    # Đảm bảo dữ liệu là 1 mảng (list), nếu chỉ có 1 lead thì bọc nó vào mảng
    new_leads = data if isinstance(data, list) else [data]
    
    # Lấy danh sách leads cũ đã có trong hệ thống
    existing = load_leads()

    added, dupes = [], []
    
    # Duyệt qua từng lead mới được gửi lên
    for lead in new_leads:
        # Thêm timestamp thời gian tạo
        lead["created_at"] = datetime.now().isoformat()
        
        is_dupe = False
        
        # Kiểm tra xem có bị trùng với dữ liệu cũ không
        for i, existing_lead in enumerate(existing):
            # Trùng nhau nếu giống hệt Email hoặc URL LinkedIn
            match_email = existing_lead.get("email") and lead.get("email") and existing_lead["email"].lower() == lead["email"].lower()
            match_url = existing_lead.get("linkedin_url") and lead.get("linkedin_url") and existing_lead["linkedin_url"] == lead["linkedin_url"]
            
            # Nếu phát hiện trùng lặp
            if match_email or match_url:
                is_dupe = True
                # Gộp dữ liệu mới vào dòng cũ (nếu có thông tin mới tốt hơn)
                for k, v in lead.items():
                    if v and v != "Chưa có":
                        existing[i][k] = v # Cập nhật thông tin mới vào record hiện tại
                
                # Đưa vào danh sách bị trùng
                dupes.append(existing[i])
                break # Đã tìm thấy trùng thì không cần kiểm tra các lead cũ khác nữa
                
        # Nếu trùng rồi thì không thêm dòng mới
        if is_dupe:
            pass 
        else:
            # Nếu chưa trùng, gắn trạng thái là "new" (mới) và thêm vào danh sách chung
            lead["status"] = "new"
            existing.append(lead)
            added.append(lead)

    # Sau khi duyệt xong tất cả các leads gửi lên, lưu lại vào file json
    save_leads(existing)
    
    # Trả về kết quả thống kê số lượng đã thêm và số lượng bị trùng
    return jsonify({"added": len(added), "duplicates": len(dupes), "leads": added})

# API xóa 1 lead theo vị trí index của nó trong mảng
@app.route("/api/leads/<int:idx>", methods=["DELETE"])
def delete_lead(idx):
    leads = load_leads()
    # Kiểm tra tính hợp lệ của index
    if idx < 0 or idx >= len(leads):
        return jsonify({"error": "Not found"}), 404
    
    # Xóa phần tử tại vị trí idx ra khỏi danh sách
    leads.pop(idx)
    save_leads(leads) # Lưu lại file
    return jsonify({"ok": True})

# API xóa hàng loạt (nhiều leads cùng lúc)
@app.route("/api/leads/bulk-delete", methods=["POST"])
def bulk_delete_leads():
    data = request.json
    indices = set(data.get("indices", [])) # Lấy danh sách các số thứ tự cần xóa
    leads = load_leads()
    
    # Dùng list comprehension: Giữ lại những lead có index KHÔNG nằm trong mảng cần xóa
    leads = [lead for i, lead in enumerate(leads) if i not in indices]
    
    save_leads(leads)
    return jsonify({"ok": True, "deleted": len(indices)})

# API xóa sạch toàn bộ dữ liệu (clear all)
@app.route("/api/leads/clear", methods=["POST"])
def clear_leads():
    # Lưu một mảng rỗng vào file
    save_leads([])
    return jsonify({"ok": True})

# API đánh dấu 1 lead là đã kiểm chứng (verified)
@app.route("/api/leads/<int:idx>/verify", methods=["POST"])
def verify_lead(idx):
    leads = load_leads()
    if idx < 0 or idx >= len(leads):
        return jsonify({"error": "Not found"}), 404
    
    # Chuyển trạng thái sang verified
    leads[idx]["status"] = "verified"
    save_leads(leads)
    return jsonify({"ok": True})

# API Thống kê tổng quan để vẽ biểu đồ số liệu trên Dashboard
@app.route("/api/stats", methods=["GET"])
def stats():
    leads = load_leads()
    total = len(leads) # Tổng số
    
    # Đếm số lượng theo từng trạng thái bằng generator expression
    verified = sum(1 for l in leads if l.get("status") == "verified")
    dupes = sum(1 for l in leads if l.get("status") == "duplicate")
    new = sum(1 for l in leads if l.get("status") == "new")
    
    return jsonify({"total": total, "verified": verified, "duplicates": dupes, "new": new})

# API xuất dữ liệu ra file CSV cho phép người dùng download
@app.route("/api/export/csv", methods=["GET"])
def export_csv():
    leads = load_leads()
    if not leads:
        return jsonify({"error": "No leads"}), 400
    
    # Sử dụng io.StringIO() để tạo file text ảo trong RAM thay vì lưu cứng trên ổ đĩa
    output = io.StringIO()
    # Danh sách các cột (headers) cần xuất
    fields = ["name", "title", "company", "email", "phone", "location", "linkedin_url", "status", "created_at"]
    
    # Tạo object DictWriter, nếu có key nào trong leads dư thừa thì sẽ bị bỏ qua (extrasaction="ignore")
    writer = csv.DictWriter(output, fieldnames=fields, extrasaction="ignore")
    writer.writeheader() # Viết dòng tiêu đề
    writer.writerows(leads) # Viết nội dung từng dòng
    
    # Đưa con trỏ đọc về đầu chuỗi ảo
    output.seek(0)
    
    # Tạo chuỗi bytes để gửi dưới dạng file download
    file_bytes = io.BytesIO(output.getvalue().encode("utf-8"))
    filename = f"leads_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    
    return send_file(
        file_bytes,
        mimetype="text/csv",
        as_attachment=True, # Bắt buộc trình duyệt phải tải xuống
        download_name=filename
    )

# Hàm Main để chạy ứng dụng khi khởi động file này
if __name__ == "__main__":
    # debug=True giúp server tự restart khi ta sửa code, chạy trên port 5000
    app.run(debug=True, port=5000)
