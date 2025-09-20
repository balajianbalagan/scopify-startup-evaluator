FROM python:3.12-slim

WORKDIR /app

# Install only essential system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p pdfs

# Set environment variables for Cloud Run
ENV PYTHONUNBUFFERED=1
ENV PORT=8080

# Expose Cloud Run port
EXPOSE 8080

# Create non-root user for security
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app
USER appuser

# Start command for Cloud Run
CMD exec uvicorn application:app --host 0.0.0.0 --port ${PORT} 