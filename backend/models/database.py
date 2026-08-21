import logging
from pymongo import MongoClient
from config import MONGO_URL

logger = logging.getLogger("CrawlLeadBackend")

if not MONGO_URL:
    logger.critical("Missing MongoURL in configuration")
    raise ValueError("Missing MongoURL in configuration")

client = MongoClient(MONGO_URL)
db = client["CrawlLead"]

leads_collection = db["Linkedin"]
fb_collection = db["Facebook"]
lk_posts_collection = db["LinkedInPosts"]
users_collection = db["Users"]

def init_indexes():
    """Khởi tạo Sparse Index cho MongoDB để tối ưu hóa truy vấn check trùng"""
    try:
        leads_collection.create_index("email_lower", sparse=True)
        leads_collection.create_index("lk_username", sparse=True)
        leads_collection.create_index("name_comp_key", sparse=True)
        leads_collection.create_index("email", sparse=True)
        leads_collection.create_index("linkedin_url", sparse=True)
        fb_collection.create_index("post_url", sparse=True)
        lk_posts_collection.create_index("post_url", sparse=True)
        logger.info("MongoDB Indexes initialized successfully")
    except Exception as e:
        logger.warning(f"Index initialization warning: {e}")
