FROM python:3.9-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
WORKDIR /app/backend
CMD ["gunicorn", "-b", "0.0.0.0:5000", "app:app"]
