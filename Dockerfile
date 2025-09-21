FROM python:3.11-slim

# Create a non-root user
RUN useradd --create-home --shell /bin/bash app

WORKDIR /app

# Upgrade pip to latest version
RUN pip install --upgrade pip

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Change ownership of the app directory to the app user
RUN chown -R app:app /app

# Switch to non-root user
USER app

# Cloud Run expects app on port 8080
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]