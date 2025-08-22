# syntax=docker/dockerfile:1.7

# Backend Dockerfile for FastAPI app using uv and uv.lock
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# Install system deps for psycopg2-binary and build tools if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
  && rm -rf /var/lib/apt/lists/*

# Install uv (fast Python package manager)
RUN curl -LsSf https://astral.sh/uv/install.sh | sh \
  && ln -s "$HOME/.local/bin/uv" /usr/local/bin/uv

WORKDIR /app

# Copy dependency files first for better caching
COPY pyproject.toml uv.lock ./

# Create virtual env and install (prod deps only)
RUN uv sync --frozen --no-dev

# Copy application code
COPY app ./app
COPY routers ./routers
COPY useage ./useage
COPY __init__.py ./

# Expose FastAPI port
EXPOSE 8000

# NOTE: Do not bake .env into the image. Mount or pass at runtime.
# To connect to your local Postgres from Linux, prefer --network=host
# or add --add-host=host.docker.internal:host-gateway and set BMS_DATABASE_URL
# to use host.docker.internal instead of localhost.

# Default start command
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
