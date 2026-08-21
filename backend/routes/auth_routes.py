import jwt, logging
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from config import SECRET_KEY
from models.database import users_collection
from services.rate_limiter import rate_limit

logger = logging.getLogger("CrawlLeadBackend")
auth_bp = Blueprint('auth', __name__)

@auth_bp.route("/api/register", methods=["POST"])
@rate_limit(limit=5, window=60)
def register():
    data = request.json or {}
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Missing username or password'}), 400
        
    if users_collection.find_one({"username": username}):
        return jsonify({'error': 'User already exists'}), 400
        
    hashed_password = generate_password_hash(password)
    users_collection.insert_one({"username": username, "password": hashed_password})
    logger.info(f"Registered user successfully: {username}")
    return jsonify({'ok': True, 'message': 'Registered successfully'})

@auth_bp.route("/api/login", methods=["POST"])
@rate_limit(limit=10, window=60)
def login():
    data = request.json or {}
    username = data.get('username')
    password = data.get('password')
    
    user = users_collection.find_one({"username": username})
    if not user or not check_password_hash(user['password'], password):
        logger.warning(f"Failed login attempt for username: {username} from IP {request.remote_addr}")
        return jsonify({'error': 'Invalid credentials'}), 401
    
    token = jwt.encode({
        'username': user['username'],
        'exp': datetime.utcnow() + timedelta(days=30)
    }, SECRET_KEY, algorithm="HS256")
    
    logger.info(f"User logged in successfully: {username}")
    return jsonify({'token': token, 'username': user['username']})
