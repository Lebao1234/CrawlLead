import time, logging
from functools import wraps
from flask import request, jsonify

logger = logging.getLogger("CrawlLeadBackend")

# In-memory storage cho Rate Limiting: {key: [timestamps]}
_rate_limit_store = {}

def rate_limit(limit=10, window=60):
    """
    Decorator rate limiter:
    - limit: số lần request tối đa trong cửa sổ thời gian
    - window: cửa sổ thời gian (tính bằng giây), mặc định 60s
    """
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            ip = request.remote_addr or "127.0.0.1"
            if request.headers.get("X-Forwarded-For"):
                ip = request.headers.get("X-Forwarded-For").split(",")[0].strip()
                
            endpoint = request.endpoint or f.__name__
            key = f"{ip}:{endpoint}"
            
            now = time.time()
            timestamps = _rate_limit_store.get(key, [])
            timestamps = [t for t in timestamps if now - t < window]
            
            if len(timestamps) >= limit:
                logger.warning(f"Rate limit exceeded for IP {ip} on endpoint {endpoint}")
                return jsonify({
                    "error": "Too many requests",
                    "message": f"Bạn đã vượt quá số lần truy cập cho phép ({limit} lần/{window}s). Vui lòng thử lại sau."
                }), 429
                
            timestamps.append(now)
            _rate_limit_store[key] = timestamps
            return f(*args, **kwargs)
        return decorated
    return decorator
