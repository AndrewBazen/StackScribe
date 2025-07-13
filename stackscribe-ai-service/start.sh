#!/bin/bash
# StackScribe AI Service Startup Script
# This script activates the virtual environment and starts the AI service

echo "🤖 Starting StackScribe AI Service..."
echo "=========================================="

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Creating one..."
    python3 -m venv venv
    
    echo "📦 Installing dependencies..."
    source venv/bin/activate
    pip install -r requirements.txt
    python -m spacy download en_core_web_sm
else
    echo "✅ Virtual environment found"
fi

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source venv/bin/activate

# Check if dependencies are installed
python -c "import fastapi, uvicorn, sentence_transformers, qdrant_client, spacy" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "❌ Dependencies not installed. Installing..."
    pip install -r requirements.txt --upgrade
    python -m spacy download en_core_web_sm
else
    echo "✅ All dependencies are available"
fi

# Start the service
echo "🚀 Starting AI service on http://localhost:8000"
echo "📖 API documentation available at http://localhost:8000/docs"
echo "🛑 Press Ctrl+C to stop the service"
echo ""

python run.py 