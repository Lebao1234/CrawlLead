from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import json, csv, os, io
from datetime import datetime, timedelta
import mimetypes
from pymongo import MongoClient
from dotenv import load_dotenv
import jwt
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash

# Đọc file .env ở thư mục gốc
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.env'))

# Đảm bảo hệ thống nhận diện đúng định dạng file CSS và JS
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('application/javascript', '.js')

base_dir = os.path.dirname(os.path.abspath(__file__))
web_app_dir = os.path.join(base_dir, "..", "frontend")

app = Flask(__name__, static_folder=web_app_dir, static_url_path="/static_assets_hidden")
CORS(app)

# ==========================================
# KHỞI TẠO KẾT NỐI MONGODB
# ==========================================
MONGO_URL = os.environ.get("MongoURL")
if not MONGO_URL:
    raise ValueError("Missing MongoURL in .env file")

client = MongoClient(MONGO_URL)
db = client["CrawlLead"]
leads_collection = db["Linkedin"]
fb_collection = db["Facebook"]
users_collection = db["Users"]

SECRET_KEY = os.environ.get("SECRET_KEY", "leadfinder_secret_key_123")

# ==========================================
# PHẦN 0: XÁC THỰC (AUTHENTICATION)
# ==========================================

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(" ")[1]
        
        if not token:
            return jsonify({'error': 'Token is missing!'}), 401
        
        try:
            data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            current_user = users_collection.find_one({"username": data['username']})
            if not current_user:
                raise Exception("User not found")
        except:
            return jsonify({'error': 'Token is invalid or expired!'}), 401
            
        return f(current_user, *args, **kwargs)
    return decorated

@app.route("/api/register", methods=["POST"])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Missing username or password'}), 400
        
    if users_collection.find_one({"username": username}):
        return jsonify({'error': 'User already exists'}), 400
        
    hashed_password = generate_password_hash(password)
    users_collection.insert_one({"username": username, "password": hashed_password})
    return jsonify({'ok': True, 'message': 'Registered successfully'})

@app.route("/api/login", methods=["POST"])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    user = users_collection.find_one({"username": username})
    if not user or not check_password_hash(user['password'], password):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    token = jwt.encode({
        'username': user['username'],
        'exp': datetime.utcnow() + timedelta(days=30)
    }, SECRET_KEY, algorithm="HS256")
    
    return jsonify({'token': token, 'username': user['username']})

# ==========================================
# PHẦN 1: PHỤC VỤ GIAO DIỆN WEB (FRONTEND)
# ==========================================

@app.route("/<path:filename>")
def serve_static(filename):
    file_path = os.path.join(web_app_dir, filename)
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
    return send_file(os.path.join(web_app_dir, "index.html"))

# ==========================================
# PHẦN 2: CÁC API ENDPOINTS XỬ LÝ DỮ LIỆU TỪ MONGODB
# ==========================================

def get_all_leads_from_db():
    return list(leads_collection.find({}, {"_id": 0}))

def get_leads_with_id():
    return list(leads_collection.find())

@app.route("/api/leads", methods=["GET"])
@token_required
def get_leads(current_user):
    leads = get_all_leads_from_db()
    return jsonify({"leads": leads, "total": len(leads)})

@app.route("/api/leads", methods=["POST"])
@token_required
def add_leads(current_user):
    data = request.json
    new_leads = data if isinstance(data, list) else [data]
    
    added, dupes = [], []
    
    for lead in new_leads:
        lead.pop("_id", None)
        lead["created_at"] = datetime.now().isoformat()
        lead["crawled_by"] = current_user["username"] # Lưu người thu thập
        
        query = {"$or": []}
        if lead.get("email") and lead["email"] != "Chưa có":
            query["$or"].append({"email": {"$regex": f"^{lead['email']}$", "$options": "i"}})
        if lead.get("linkedin_url"):
            query["$or"].append({"linkedin_url": lead["linkedin_url"]})
            
        if not query["$or"]:
            existing_lead = None
        else:
            existing_lead = leads_collection.find_one(query)
            
        if existing_lead:
            update_data = {}
            for k, v in lead.items():
                if v and v != "Chưa có" and k != "status":
                    update_data[k] = v
            
            if update_data:
                leads_collection.update_one({"_id": existing_lead["_id"]}, {"$set": update_data})
                
            existing_lead.pop("_id", None)
            existing_lead.update(update_data)
            dupes.append(existing_lead)
        else:
            lead["status"] = "new"
            leads_collection.insert_one(lead)
            inserted_lead = lead.copy()
            inserted_lead.pop("_id", None)
            added.append(inserted_lead)

    return jsonify({"added": len(added), "duplicates": len(dupes), "leads": added})

@app.route("/api/leads/<int:idx>", methods=["DELETE"])
@token_required
def delete_lead(current_user, idx):
    leads = get_leads_with_id()
    if idx < 0 or idx >= len(leads):
        return jsonify({"error": "Not found"}), 404
    
    doc_to_delete = leads[idx]
    leads_collection.delete_one({"_id": doc_to_delete["_id"]})
    return jsonify({"ok": True})

@app.route("/api/leads/bulk-delete", methods=["POST"])
@token_required
def bulk_delete_leads(current_user):
    data = request.json
    indices = set(data.get("indices", []))
    leads = get_leads_with_id()
    
    ids_to_delete = [leads[i]["_id"] for i in range(len(leads)) if i in indices]
    
    if ids_to_delete:
        leads_collection.delete_many({"_id": {"$in": ids_to_delete}})
        
    return jsonify({"ok": True, "deleted": len(ids_to_delete)})

@app.route("/api/leads/clear", methods=["POST"])
@token_required
def clear_leads(current_user):
    leads_collection.delete_many({})
    return jsonify({"ok": True})

@app.route("/api/leads/<int:idx>/verify", methods=["POST"])
@token_required
def verify_lead(current_user, idx):
    leads = get_leads_with_id()
    if idx < 0 or idx >= len(leads):
        return jsonify({"error": "Not found"}), 404
    
    doc_to_verify = leads[idx]
    leads_collection.update_one({"_id": doc_to_verify["_id"]}, {"$set": {"status": "verified"}})
    return jsonify({"ok": True})

@app.route("/api/stats", methods=["GET"])
def stats():
    # Public API or optional auth? Let's make it public so checkBackend works easily without token
    total = leads_collection.count_documents({})
    verified = leads_collection.count_documents({"status": "verified"})
    dupes = leads_collection.count_documents({"status": "duplicate"})
    new = leads_collection.count_documents({"status": "new"})
    
    return jsonify({"total": total, "verified": verified, "duplicates": dupes, "new": new})

@app.route("/api/export/csv", methods=["GET"])
def export_csv():
    # Exporting CSV through browser might not send token easily via header. 
    # Usually we pass token in query param or rely on session.
    # For simplicity, we can get token from query arg: ?token=...
    token = request.args.get('token')
    if not token:
        return jsonify({'error': 'Token is missing'}), 401
    try:
        jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except:
        return jsonify({'error': 'Token is invalid'}), 401

    leads = get_all_leads_from_db()
    if not leads:
        return jsonify({"error": "No leads"}), 400
    
    output = io.StringIO()
    fields = ["name", "title", "company", "email", "phone", "location", "linkedin_url", "status", "created_at", "crawled_by"]
    
    writer = csv.DictWriter(output, fieldnames=fields, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(leads)
    
    output.seek(0)
    file_bytes = io.BytesIO(output.getvalue().encode("utf-8"))
    filename = f"leads_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    
    return send_file(
        file_bytes,
        mimetype="text/csv",
        as_attachment=True,
        download_name=filename
    )

# ==========================================
# PHẦN 3: CÁC API ENDPOINTS XỬ LÝ DỮ LIỆU TỪ FACEBOOK
# ==========================================

def get_all_fb_from_db():
    return list(fb_collection.find({}, {"_id": 0}))

def get_fb_with_id():
    return list(fb_collection.find())

@app.route("/api/facebook", methods=["GET"])
@token_required
def get_fb_posts(current_user):
    posts = get_all_fb_from_db()
    return jsonify({"posts": posts, "total": len(posts)})

@app.route("/api/facebook", methods=["POST"])
@token_required
def add_fb_posts(current_user):
    data = request.json
    new_posts = data if isinstance(data, list) else [data]
    
    added, dupes = [], []
    
    for post in new_posts:
        post.pop("_id", None)
        post["created_at"] = datetime.now().isoformat()
        post["crawled_by"] = current_user["username"] # Lưu người thu thập
        
        query = None
        if post.get("post_url"):
            query = {"post_url": post["post_url"]}
        
        existing_post = fb_collection.find_one(query) if query else None
            
        if existing_post:
            update_data = {}
            for k, v in post.items():
                if v and k != "status":
                    update_data[k] = v
            
            if update_data:
                fb_collection.update_one({"_id": existing_post["_id"]}, {"$set": update_data})
                
            existing_post.pop("_id", None)
            existing_post.update(update_data)
            dupes.append(existing_post)
        else:
            fb_collection.insert_one(post)
            inserted_post = post.copy()
            inserted_post.pop("_id", None)
            added.append(inserted_post)

    return jsonify({"added": len(added), "duplicates": len(dupes), "posts": added})

@app.route("/api/facebook/<int:idx>", methods=["DELETE"])
@token_required
def delete_fb_post(current_user, idx):
    posts = get_fb_with_id()
    if idx < 0 or idx >= len(posts):
        return jsonify({"error": "Not found"}), 404
    
    doc_to_delete = posts[idx]
    fb_collection.delete_one({"_id": doc_to_delete["_id"]})
    return jsonify({"ok": True})

@app.route("/api/facebook/clear", methods=["POST"])
@token_required
def clear_fb_posts(current_user):
    fb_collection.delete_many({})
    return jsonify({"ok": True})

if __name__ == "__main__":
    app.run(debug=True, port=5000)
