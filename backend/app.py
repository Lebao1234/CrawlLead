import os, sys, mimetypes, logging, gzip, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from logging.handlers import RotatingFileHandler
from flask import Flask, jsonify, send_file, request
from flask_cors import CORS
from config import WEB_APP_DIR, LOG_FILE
from models.database import init_indexes
from routes.auth_routes import auth_bp
from routes.lead_routes import lead_bp
from routes.fb_routes import fb_bp
from routes.lk_routes import lk_bp
from routes.crawler_routes import crawler_bp

# ==========================================
# CẤU HÌNH LOGGING HỆ THỐNG (CONSOLE & FILE LOG)
# ==========================================
formatter = logging.Formatter('%(asctime)s [%(levelname)s] %(name)s: %(message)s')

file_handler = RotatingFileHandler(LOG_FILE, maxBytes=5*1024*1024, backupCount=3, encoding='utf-8')
file_handler.setFormatter(formatter)
file_handler.setLevel(logging.INFO)

console_handler = logging.StreamHandler()
console_handler.setFormatter(formatter)
console_handler.setLevel(logging.INFO)

logger = logging.getLogger("CrawlLeadBackend")
logger.setLevel(logging.INFO)
logger.addHandler(file_handler)
logger.addHandler(console_handler)

# Đảm bảo hệ thống nhận diện đúng định dạng MIME cho file CSS và JS
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('application/javascript', '.js')

# Khởi tạo ứng dụng Flask
app = Flask(__name__, static_folder=WEB_APP_DIR, static_url_path="/static_assets_hidden")

allowed_env = os.environ.get("ALLOWED_ORIGINS", "")
allowed_list = [o.strip() for o in allowed_env.split(",") if o.strip()]
default_origins = [
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "http://localhost:3000",
    "https://crawllead.onrender.com"
]
combined_origins = list(set(default_origins + allowed_list))

# Cấu hình CORS bảo mật: Giới hạn Origin cho Extension và Web Dashboard
CORS(app, origins=combined_origins + [re.compile(r"^chrome-extension://.*$")], supports_credentials=True)

# Đăng ký các Modular Blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(lead_bp)
app.register_blueprint(fb_bp)
app.register_blueprint(lk_bp)
app.register_blueprint(crawler_bp)

# Khởi tạo Mongo Indexes
init_indexes()

# Global Exception Handler cho toàn bộ các Route
@app.errorhandler(Exception)
def handle_global_exception(e):
    logger.error(f"Unhandled Exception: {str(e)}", exc_info=True)
    return jsonify({"error": "Internal server error", "details": str(e)}), 500

# ==========================================
# GZIP RESPONSE COMPRESSION MIDDLEWARE (Mục 3)
# ==========================================
@app.after_request
def compress_response(response):
    accept_encoding = request.headers.get('Accept-Encoding', '')
    if 'gzip' not in accept_encoding.lower():
        return response
    
    if response.status_code < 200 or response.status_code >= 300 or 'Content-Encoding' in response.headers:
        return response
        
    if response.direct_passthrough:
        return response

    if response.mimetype in ['application/json', 'text/html', 'text/css', 'application/javascript', 'text/plain']:
        content = response.get_data()
        if len(content) > 400:
            compressed_content = gzip.compress(content, compresslevel=6)
            response.set_data(compressed_content)
            response.headers['Content-Encoding'] = 'gzip'
            response.headers['Content-Length'] = len(compressed_content)
            response.headers['Vary'] = 'Accept-Encoding'
            
    return response

# ==========================================
# PHỤC VỤ GIAO DIỆN WEB FRONTEND
# ==========================================
@app.route("/<path:filename>")
def serve_static(filename):
    file_path = os.path.join(WEB_APP_DIR, filename)
    if os.path.exists(file_path):
        mimetype = None
        if filename.endswith(".css"):
            mimetype = "text/css"
        elif filename.endswith(".js"):
            mimetype = "application/javascript"
        return send_file(file_path, mimetype=mimetype)
    return jsonify({"error": "Not found"}), 404

@app.route("/")
def index():
    return send_file(os.path.join(WEB_APP_DIR, "index.html"))

if __name__ == "__main__":
    logger.info("Starting CrawlLead Modular Backend Server on port 5000...")
    app.run(debug=True, port=5000)
