FROM python:3.9-slim

# Thiết lập thư mục làm việc gốc
WORKDIR /app

# Copy requirements trước để tận dụng Docker cache
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy cả 2 thư mục backend và web-app vào container
COPY backend/ ./backend/
COPY /frontend/ ./frontend/

# Chuyển thư mục làm việc vào backend để chạy gunicorn
WORKDIR /app/backend

# Render sẽ tự động gán cổng vào biến môi trường PORT, 
# nhưng nếu không có thì mặc định dùng 5000
CMD gunicorn -b 0.0.0.0:${PORT:-5000} app:app
