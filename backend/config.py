import os, secrets, logging
from dotenv import load_dotenv

logger = logging.getLogger("CrawlLeadBackend")
base_dir = os.path.dirname(os.path.abspath(__file__))

# Read .env file from workspace root
load_dotenv(os.path.join(base_dir, '..', '.env'))

MONGO_URL = os.environ.get("MongoURL")

# Check & Secure SECRET_KEY
env_secret = os.environ.get("SECRET_KEY")
if env_secret and env_secret.strip():
    SECRET_KEY = env_secret.strip()
else:
    # Auto-generate a secure 256-bit random key for process lifetime to prevent token forgery
    SECRET_KEY = secrets.token_hex(32)
    logger.warning("⚠️ SECRET_KEY missing in .env! Generated secure 256-bit random key for process security.")

WEB_APP_DIR = os.path.join(base_dir, "..", "frontend")
LOG_DIR = os.path.join(base_dir, "logs")
LOG_FILE = os.path.join(LOG_DIR, "app.log")

if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR, exist_ok=True)
