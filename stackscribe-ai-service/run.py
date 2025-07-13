#!/usr/bin/env python3
"""
Startup script for StackScribe AI Service
"""
import sys
import subprocess
import os

def check_dependencies():
    """Check if all required dependencies are installed"""
    try:
        import fastapi
        import uvicorn
        import sentence_transformers
        import qdrant_client
        import spacy
        print("✓ All dependencies are installed")
        return True
    except ImportError as e:
        print(f"✗ Missing dependency: {e}")
        print("Please run: pip install -r requirements.txt")
        return False

def check_spacy_model():
    """Check if spaCy model is downloaded"""
    try:
        import spacy
        nlp = spacy.load("en_core_web_sm")
        print("✓ spaCy model is available")
        return True
    except OSError:
        print("✗ spaCy model not found")
        print("Installing spaCy model...")
        subprocess.run([sys.executable, "-m", "spacy", "download", "en_core_web_sm"])
        return True

def check_qdrant():
    """Check if Qdrant is accessible"""
    try:
        from qdrant_client import QdrantClient
        client = QdrantClient(host="localhost", port=6333)
        client.get_collections()
        print("✓ Qdrant is accessible")
        return True
    except Exception as e:
        print(f"✗ Qdrant connection failed: {e}")
        print("Please ensure Qdrant is running in Docker:")
        print("docker run -p 6333:6333 qdrant/qdrant")
        return False

def main():
    print("StackScribe AI Service Startup")
    print("=" * 40)
    
    if not check_dependencies():
        sys.exit(1)
    
    check_spacy_model()
    
    if not check_qdrant():
        print("\nWarning: Qdrant not available. Service will start but may not work properly.")
    
    print("\nStarting AI service...")
    print("Available at: http://localhost:8000")
    print("API docs at: http://localhost:8000/docs")
    
    # Start the service
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

if __name__ == "__main__":
    main() 