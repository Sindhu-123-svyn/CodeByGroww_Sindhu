# Serves both the API (app.main:app) and the two worker processes
# (workers.ingestion, workers.signal_engine) — docker-compose.yml overrides
# `command` per service, all three run from this one image (plan §3/§4:
# separate processes, same codebase, never importing one another).
FROM python:3.13-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8000

# Default command — the API server. Overridden by the worker services.
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
