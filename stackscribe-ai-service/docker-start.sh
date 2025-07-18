#!/bin/bash
# StackScribe AI Service Docker Startup Script
# This script uses Docker Compose to start Qdrant and the AI service

echo "🐳 Starting StackScribe AI Service with Docker Compose..."
echo "==========================================================="

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose not found. Please install Docker Compose."
    exit 1
fi

# Check if docker-compose.yml exists
if [ ! -f "$COMPOSE_FILE" ]; then
    echo "❌ docker-compose.yml not found at $COMPOSE_FILE"
    exit 1
fi

echo "✅ Docker is running"
echo "📄 Using compose file: $COMPOSE_FILE"

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f "$COMPOSE_FILE" down

# Pull latest images
echo "📥 Pulling latest images..."
docker-compose -f "$COMPOSE_FILE" pull qdrant

# Build and start services
echo "🏗️  Building and starting services..."
docker-compose -f "$COMPOSE_FILE" up --build -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."

# Function to check service health
check_health() {
    local service_name=$1
    local url=$2
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$url" >/dev/null 2>&1; then
            echo "✅ $service_name is healthy"
            return 0
        fi
        echo "⏳ Waiting for $service_name... (attempt $attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done

    echo "❌ $service_name failed to become healthy"
    return 1
}

# Check Qdrant health
if check_health "Qdrant" "http://localhost:6333/"; then
    # Check AI service health
    if check_health "AI Service" "http://localhost:8000/health"; then
        echo ""
        echo "🎉 All services are healthy and ready!"
        echo "📊 Qdrant: http://localhost:6333"
        echo "🤖 AI Service: http://localhost:8000"
        echo "📖 API Documentation: http://localhost:8000/docs"
        echo ""
        echo "💡 To view logs: docker-compose -f \"$COMPOSE_FILE\" logs -f"
        echo "🛑 To stop: docker-compose -f \"$COMPOSE_FILE\" down"
    else
        echo "❌ AI Service failed to start"
        echo "📋 Logs:"
        docker-compose -f "$COMPOSE_FILE" logs ai-service
        exit 1
    fi
else
    echo "❌ Qdrant failed to start"
    echo "📋 Logs:"
    docker-compose -f "$COMPOSE_FILE" logs qdrant
    exit 1
fi 