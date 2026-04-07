FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install python dependencies from the python-engine folder
COPY python-engine/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the python-engine source code into the app directory
COPY python-engine/ .

# Expose the API port (Cloud Run uses 8080 by default)
EXPOSE 8080

# Start FastAPI server using Gunicorn and Uvicorn workers for concurrency
# Cloud Run provides a PORT environment variable that we must listen on
# Note: Using 1 worker because Cloud Run natively handles horizontal scaling,
# and multiple workers will exceed the default 512MB memory limit on boot.
CMD ["sh", "-c", "gunicorn api_server:app --workers 1 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:${PORT:-8080}"]
