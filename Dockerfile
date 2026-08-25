FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=10000 \
    RIZOMA_HOST=0.0.0.0 \
    RIZOMA_DATA_DIR=/app/data \
    RIZOMA_DB_PATH=/app/data/rizoma.db \
    RIZOMA_CONFIG_PATH=/app/data/config.yaml \
    RIZOMA_OPEN_BROWSER=0

WORKDIR /app

RUN adduser --disabled-password --gecos "" appuser

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend ./backend
COPY frontend ./frontend
COPY public ./public
COPY .env.example ./.env.example
COPY rizoma.py .

RUN mkdir -p /app/data && chown -R appuser:appuser /app

USER appuser

EXPOSE 10000

CMD ["python", "rizoma.py"]