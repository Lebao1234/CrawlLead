import logging
from datetime import datetime
from flask import Blueprint, request, jsonify
from pymongo import UpdateOne
from models.database import fb_collection
from services.auth_service import token_required
from services.excel_service import (
    FB_EXPORT_HEADERS, _format_fb_row, generic_export_csv, generic_export_xlsx, parse_import_file
)

logger = logging.getLogger("CrawlLeadBackend")
fb_bp = Blueprint('facebook', __name__)

def get_all_fb_from_db():
    return list(fb_collection.find({}, {"_id": 0}))

def get_fb_with_id():
    return list(fb_collection.find())

@fb_bp.route("/api/facebook", methods=["GET"])
@token_required
def get_fb_posts(current_user):
    posts = get_all_fb_from_db()
    return jsonify({"posts": posts, "total": len(posts)})

@fb_bp.route("/api/facebook", methods=["POST"])
@token_required
def add_fb_posts(current_user):
    data = request.json
    new_posts = data if isinstance(data, list) else [data]
    username = current_user["username"]
    now_iso = datetime.now().isoformat()

    urls = [p["post_url"] for p in new_posts if p.get("post_url")]
    existing_docs = list(fb_collection.find({"post_url": {"$in": urls}})) if urls else []
    existing_map = {d["post_url"]: d for d in existing_docs if d.get("post_url")}

    added, dupes = [], []
    bulk_updates = []
    to_insert = []

    for post in new_posts:
        post.pop("_id", None)
        post["created_at"] = now_iso
        post["crawled_by"] = username
        
        p_url = post.get("post_url")
        existing_post = existing_map.get(p_url) if p_url else None
            
        if existing_post:
            update_data = {}
            for k, v in post.items():
                if v and k not in ["status", "_id"]:
                    update_data[k] = v
            
            if update_data and "_id" in existing_post:
                bulk_updates.append(UpdateOne({"_id": existing_post["_id"]}, {"$set": update_data}))
                
            res = existing_post.copy()
            res.pop("_id", None)
            res.update(update_data)
            dupes.append(res)
        else:
            to_insert.append(post)
            inserted_post = post.copy()
            inserted_post.pop("_id", None)
            added.append(inserted_post)

    if bulk_updates:
        fb_collection.bulk_write(bulk_updates, ordered=False)
    if to_insert:
        fb_collection.insert_many(to_insert)

    logger.info(f"User {username} added {len(added)} FB posts ({len(dupes)} duplicates merged)")
    return jsonify({"added": len(added), "duplicates": len(dupes), "posts": added})

@fb_bp.route("/api/facebook/<int:idx>", methods=["GET", "DELETE", "POST"])
@fb_bp.route("/api/facebook/<int:idx>/delete", methods=["GET", "DELETE", "POST"])
@token_required
def delete_fb_post(current_user, idx):
    posts = get_fb_with_id()
    if idx < 0 or idx >= len(posts):
        return jsonify({"error": "Not found"}), 404
    
    doc_to_delete = posts[idx]
    fb_collection.delete_one({"_id": doc_to_delete["_id"]})
    return jsonify({"ok": True, "deleted": 1})

@fb_bp.route("/api/facebook/delete", methods=["GET", "DELETE", "POST"])
@token_required
def delete_fb_post_query(current_user):
    idx_str = request.args.get('idx')
    if idx_str is None and request.is_json and request.json:
        idx_str = request.json.get('idx')
    if idx_str is None:
        return jsonify({"error": "Missing idx parameter"}), 400
    try:
        idx = int(idx_str)
        return delete_fb_post(current_user, idx)
    except ValueError:
        return jsonify({"error": "Invalid idx parameter"}), 400

@fb_bp.route("/api/facebook/clear", methods=["GET", "POST", "DELETE"])
@token_required
def clear_fb_posts(current_user):
    result = fb_collection.delete_many({})
    return jsonify({"ok": True, "deleted": result.deleted_count})

@fb_bp.route("/api/facebook/export/csv", methods=["GET"])
def export_fb_csv(): 
    return generic_export_csv(fb_collection, FB_EXPORT_HEADERS, _format_fb_row, "fb_posts")

@fb_bp.route("/api/facebook/export/xlsx", methods=["GET"])
def export_fb_xlsx(): 
    return generic_export_xlsx(fb_collection, FB_EXPORT_HEADERS, _format_fb_row, "fb_posts")

@fb_bp.route("/api/facebook/import", methods=["POST"])
@token_required
def import_fb(current_user):
    if 'file' not in request.files: return jsonify({"error": "No file uploaded"}), 400
    file = request.files['file']
    if not file.filename.endswith(('.csv', '.xlsx')): return jsonify({"error": "Invalid file type"}), 400
    try:
        data = parse_import_file(file, file.filename, {v: k for k, v in zip(FB_EXPORT_HEADERS, ["author", "group_name", "content_snippet", "post_url", "created_at", "crawled_by"])})
        added, dupes = 0, 0
        for post in data:
            post["crawled_by"] = current_user["username"]
            if not post.get("created_at"): post["created_at"] = datetime.now().isoformat()
            query = {"post_url": post["post_url"]} if post.get("post_url") else None
            existing = fb_collection.find_one(query) if query else None
            if existing: dupes += 1
            else:
                fb_collection.insert_one(post)
                added += 1
        return jsonify({"added": added, "duplicates": dupes})
    except Exception as e:
        logger.error(f"Error importing FB posts: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500
