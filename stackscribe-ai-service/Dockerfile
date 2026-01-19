# CUDA base image for GPU acceleration (GTX 970 compatible)
# Using CUDA 11.8 for broad compatibility with older GPUs
FROM nvidia/cuda:11.8.0-runtime-ubuntu22.04 AS base

# Set working directory
WORKDIR /app

# Install Python and system dependencies
RUN apt-get update && apt-get install -y \
    python3.10 \
    python3-pip \
    python3.10-venv \
    curl \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/bin/python3.10 /usr/bin/python \
    && ln -sf /usr/bin/pip3 /usr/bin/pip

# Copy requirements first for better Docker layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip

# Install PyTorch with CUDA 11.8 support (compatible with GTX 970)
RUN pip install --no-cache-dir torch==2.1.0 --index-url https://download.pytorch.org/whl/cu118

# Install remaining requirements (excluding torch which we installed separately)
RUN grep -v "^torch==" requirements.txt > requirements_no_torch.txt \
    && pip install --no-cache-dir -r requirements_no_torch.txt \
    && rm requirements_no_torch.txt

# Download spaCy model
RUN python -m spacy download en_core_web_sm

# Copy application code
COPY . .

# Create directories for models and cache
RUN mkdir -p /app/models /app/cache

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
# Default to CUDA device (can be overridden to 'cpu' if no GPU available)
ENV TORCH_DEVICE=cuda

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application with uvloop/httptools for better performance
CMD ["python", "-c", "import uvicorn; uvicorn.run('main:app', host='0.0.0.0', port=8000, loop='uvloop', http='httptools')"] 