from flask import Blueprint, jsonify
from models.database import leads_collection, fb_collection, lk_posts_collection, users_collection

import re as _re

crawler_bp = Blueprint('crawler', __name__)

_EMAIL_RE = _re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')

@crawler_bp.route("/api/stats", methods=["GET"])
def stats():
    total = leads_collection.count_documents({})
    verified = leads_collection.count_documents({"status": "verified"})
    dupes = leads_collection.count_documents({"status": "duplicate"})
    new = leads_collection.count_documents({"status": "new"})
    error_status_count = leads_collection.count_documents({"status": {"$in": ["error", "failed"]}})
    lk_posts = lk_posts_collection.count_documents({})
    fb_posts = fb_collection.count_documents({})

    # Đếm Lead có email trống hoặc không đúng định dạng
    no_email = 0
    invalid_email = 0
    for doc in leads_collection.find({}, {"email": 1, "_id": 0}):
        email = (doc.get("email") or "").strip()
        if not email or email.lower() in ("chưa có", "n/a", "-", ""):
            no_email += 1
        elif not _EMAIL_RE.match(email):
            invalid_email += 1

    error_leads = error_status_count + no_email + invalid_email

    return jsonify({
        "total": total,
        "verified": verified,
        "duplicates": dupes,
        "new": new,
        "error_status": error_status_count,
        "lk_posts": lk_posts,
        "fb_posts": fb_posts,
        "no_email": no_email,
        "invalid_email": invalid_email,
        "missing_contact": no_email + invalid_email,
        "error_leads": error_leads
    })


@crawler_bp.route("/api/crawlers", methods=["GET"])
def get_crawlers():
    """
    Lấy toàn bộ danh sách người dùng đã cào.
    Xử lý cả 2 trường hợp crawled_by lưu dạng:
      - String: "userA"
      - String join: "userA, userB"  (legacy)
      - Array: ["userA", "userB"]
    Kết hợp với danh sách tài khoản Users đã đăng ký.
    """
    crawler_set = set()

    # Cách 1: Dùng aggregation $unwind để xử lý đúng cả String và Array
    pipeline = [
        {"$project": {
            "crawled_by": {
                "$cond": {
                    "if": {"$isArray": "$crawled_by"},
                    "then": "$crawled_by",
                    "else": {"$split": [{"$ifNull": ["$crawled_by", ""]}, ", "]}
                }
            }
        }},
        {"$unwind": "$crawled_by"},
        {"$match": {"crawled_by": {"$ne": ""}}},
        {"$group": {"_id": "$crawled_by"}},
        {"$sort": {"_id": 1}}
    ]

    for doc in leads_collection.aggregate(pipeline):
        name = (doc.get("_id") or "").strip()
        if name:
            crawler_set.add(name)

    # Cách 2: Lấy thêm tất cả tài khoản đã đăng ký từ bảng Users
    for user in users_collection.find({}, {"username": 1, "_id": 0}):
        name = (user.get("username") or "").strip()
        if name:
            crawler_set.add(name)

    crawlers = sorted(list(crawler_set))
    return jsonify({"crawlers": crawlers})

