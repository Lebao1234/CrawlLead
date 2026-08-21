import logging
from datetime import datetime
from flask import Blueprint, request, jsonify
from pymongo import UpdateOne
from models.database import lk_posts_collection
from services.auth_service import token_required
from services.excel_service import (
    LK_EXPORT_HEADERS, _format_lk_row, generic_export_csv, generic_export_xlsx, parse_import_file
)

logger = logging.getLogger("CrawlLeadBackend")
lk_bp = Blueprint('linkedin_posts', __name__)

def get_all_lk_posts_from_db():
    return list(lk_posts_collection.find({}, {"_id": 0}))

def get_lk_posts_with_id():
    return list(lk_posts_collection.find())

@lk_bp.route("/api/lk-posts", methods=["GET"])
@token_required
def get_lk_posts(current_user):
    posts = get_all_lk_posts_from_db()
    return jsonify({"posts": posts, "total": len(posts)})

@lk_bp.route("/api/lk-posts", methods=["POST"])
@token_required
def add_lk_posts(current_user):
    data = request.json
    new_posts = data if isinstance(data, list) else [data]
    username = current_user["username"]
    now_iso = datetime.now().isoformat()

    urls = [p["post_url"] for p in new_posts if p.get("post_url")]
    existing_docs = list(lk_posts_collection.find({"post_url": {"$in": urls}})) if urls else []
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
        lk_posts_collection.bulk_write(bulk_updates, ordered=False)
    if to_insert:
        lk_posts_collection.insert_many(to_insert)

    logger.info(f"User {username} added {len(added)} LK posts ({len(dupes)} duplicates merged)")
    return jsonify({"added": len(added), "duplicates": len(dupes), "posts": added})

@lk_bp.route("/api/lk-posts/<int:idx>", methods=["GET", "DELETE", "POST"])
@lk_bp.route("/api/lk-posts/<int:idx>/delete", methods=["GET", "DELETE", "POST"])
@token_required
def delete_lk_post(current_user, idx):
    posts = get_lk_posts_with_id()
    if idx < 0 or idx >= len(posts):
        return jsonify({"error": "Not found"}), 404
    
    doc_to_delete = posts[idx]
    lk_posts_collection.delete_one({"_id": doc_to_delete["_id"]})
    return jsonify({"ok": True, "deleted": 1})

@lk_bp.route("/api/lk-posts/delete", methods=["GET", "DELETE", "POST"])
@token_required
def delete_lk_post_query(current_user):
    idx_str = request.args.get('idx')
    if idx_str is None and request.is_json and request.json:
        idx_str = request.json.get('idx')
    if idx_str is None:
        return jsonify({"error": "Missing idx parameter"}), 400
    try:
        idx = int(idx_str)
        return delete_lk_post(current_user, idx)
    except ValueError:
        return jsonify({"error": "Invalid idx parameter"}), 400

@lk_bp.route("/api/lk-posts/bulk-delete", methods=["GET", "POST", "DELETE"])
@token_required
def bulk_delete_lk_posts(current_user):
    data = request.json or {}
    if not data and request.args.get("indices"):
        data = {"indices": [int(x) for x in request.args.get("indices").split(",") if x.isdigit()]}
    indices = set(data.get("indices", []))
    posts = get_lk_posts_with_id()
    ids_to_delete = [posts[i]["_id"] for i in range(len(posts)) if i in indices]
    if ids_to_delete:
        result = lk_posts_collection.delete_many({"_id": {"$in": ids_to_delete}})
        return jsonify({"ok": True, "deleted": result.deleted_count})
    return jsonify({"ok": True, "deleted": 0})

@lk_bp.route("/api/lk-posts/clear", methods=["GET", "POST", "DELETE"])
@token_required
def clear_lk_posts(current_user):
    result = lk_posts_collection.delete_many({})
    return jsonify({"ok": True, "deleted": result.deleted_count})

@lk_bp.route("/api/lk-posts/export/csv", methods=["GET"])
def export_lk_csv(): 
    return generic_export_csv(lk_posts_collection, LK_EXPORT_HEADERS, _format_lk_row, "lk_posts")

@lk_bp.route("/api/lk-posts/export/xlsx", methods=["GET"])
def export_lk_xlsx(): 
    return generic_export_xlsx(lk_posts_collection, LK_EXPORT_HEADERS, _format_lk_row, "lk_posts")

@lk_bp.route("/api/lk-posts/import", methods=["POST"])
@token_required
def import_lk(current_user):
    if 'file' not in request.files: return jsonify({"error": "No file uploaded"}), 400
    file = request.files['file']
    if not file.filename.endswith(('.csv', '.xlsx')): return jsonify({"error": "Invalid file type"}), 400
    try:
        data = parse_import_file(file, file.filename, {v: k for k, v in zip(LK_EXPORT_HEADERS, ["author", "author_headline", "content_snippet", "post_type", "reactions_count", "post_url", "created_at", "crawled_by"])})
        added, dupes = 0, 0
        for post in data:
            post["crawled_by"] = current_user["username"]
            if not post.get("created_at"): post["created_at"] = datetime.now().isoformat()
            query = {"post_url": post["post_url"]} if post.get("post_url") else None
            existing = lk_posts_collection.find_one(query) if query else None
            if existing: dupes += 1
            else:
                lk_posts_collection.insert_one(post)
                added += 1
        return jsonify({"added": added, "duplicates": dupes})
    except Exception as e:
        logger.error(f"Error importing LK posts: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500
