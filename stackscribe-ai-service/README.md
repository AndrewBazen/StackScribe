# StackScribe AI Service

Advanced AI-powered link suggestion service using sentence transformers, cross-encoder reranking, and custom heuristics.

## Features

- **Professional Embeddings**: Uses `nomic-ai/nomic-embed-text-v1` for high-quality text embeddings
- **Cross-encoder Reranking**: BAAI/bge-reranker-base for improved relevance scoring
- **Vector Database**: Qdrant for efficient similarity search with RRF hybrid search
- **Custom Heuristics**: Advanced scoring with heading match, NER overlap, slug fuzzy matching, and code symbol detection
- **FastAPI**: REST API with automatic OpenAPI documentation

## Prerequisites

1. **Docker & Docker Compose**: Required for containerized deployment
2. **Python 3.8+**: Required for local development (optional)

## Installation & Usage

### Option 1: Docker Compose (Recommended)
```bash
./docker-start.sh
```
This script will automatically:
- Start Qdrant vector database container
- Build and start the AI service container
- Wait for all services to be healthy
- Provide health status and endpoints

**Services:**
- Qdrant: `http://localhost:6333`
- AI Service: `http://localhost:8000`
- API Documentation: `http://localhost:8000/docs`

**Management commands:**
```bash
# Start services
./docker-start.sh

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Restart services
docker-compose restart
```

### Option 2: Local Development
```bash
./start.sh
```
This script will automatically:
- Create a virtual environment if it doesn't exist
- Install all dependencies
- Download the spaCy model
- Start the service locally

**Note**: You'll need to start Qdrant separately:
```bash
docker run -p 6333:6333 qdrant/qdrant
```

### Option 3: Manual Setup
1. Create virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Download spaCy model:
   ```bash
   python -m spacy download en_core_web_sm
   ```

4. Start Qdrant:
   ```bash
   docker run -p 6333:6333 qdrant/qdrant
   ```

5. Start the service:
   ```bash
   python main.py
   ```

## API Endpoints

### GET `/health`
Health check endpoint that verifies Qdrant connection.

### POST `/api/suggestions`
Get AI-powered link suggestions for a given text.

**Request Body:**
```json
{
  "text": "Your text content here",
  "current_note": "current_note_filename.md"
}
```

**Response:**
```json
[
  {
    "note": "suggested_note.md",
    "score": 0.85,
    "reasoning": "Vector similarity + cross-encoder reranking + heuristics (score: 0.850)"
  }
]
```

## Configuration

Edit the configuration constants in `main.py`:

- `THRESHOLD`: Minimum score for suggestions (default: 0.05)
- `TOP_K`: Maximum number of suggestions (default: 8)
- `COLLECTION`: Qdrant collection name (default: "note_chunks")
- `EMBED_MODEL`: Sentence transformer model (default: "nomic-ai/nomic-embed-text-v1")
- `RERANKER_ID`: Cross-encoder model (default: "BAAI/bge-reranker-base")

## Heuristics

The service uses several heuristics to improve suggestion quality:

1. **Heading Match Bonus**: Boosts suggestions for markdown headings that match query terms
2. **NER Overlap Bonus**: Uses spaCy NER to find named entity overlaps
3. **Slug Fuzzy Bonus**: Fuzzy matching between query and note titles
4. **Code Symbol Bonus**: Detects and matches programming-related terms and patterns

## Performance

- **Processing Time**: 10-100ms per request (depending on corpus size)
- **Memory Usage**: ~500MB-2GB (model dependent)
- **Accuracy**: High-quality suggestions with semantic understanding

## Integration

This service is designed to integrate with the StackScribe Tauri app for real-time link suggestions during note editing. 