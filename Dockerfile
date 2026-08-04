FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    RIZOMA_OPEN_BROWSER=0

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend ./backend
COPY frontend ./frontend
COPY public ./public
COPY data ./data
COPY config.yaml .
COPY rizoma.py .

EXPOSE 8000

CMD ["python", "rizoma.py"]
