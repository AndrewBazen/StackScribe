"""Global pytest fixtures and configuration."""
import pytest
from unittest.mock import Mock, MagicMock, AsyncMock, patch
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@pytest.fixture(autouse=True)
def mock_env_vars(monkeypatch):
    """Set default environment variables for testing."""
    monkeypatch.setenv("QDRANT_HOST", "localhost")
    monkeypatch.setenv("QDRANT_PORT", "6333")
    monkeypatch.setenv("THRESHOLD", "0.80")
    monkeypatch.setenv("TOP_K", "8")
    monkeypatch.setenv("COLLECTION", "test_note_chunks")
    monkeypatch.setenv("REDIS_URL", "")  # Disable Redis in tests


@pytest.fixture
def mock_qdrant_client():
    """Mock Qdrant client for testing."""
    mock = MagicMock()
    mock.search.return_value = []
    mock.upsert.return_value = None
    mock.delete.return_value = None
    mock.get_collections.return_value = Mock(collections=[])
    mock.get_collection.return_value = Mock(points_count=0)
    return mock


@pytest.fixture
def mock_embedder():
    """Mock SentenceTransformer embedder."""
    import numpy as np

    mock = MagicMock()
    # Return deterministic embeddings for testing
    mock.encode.side_effect = lambda texts, **kwargs: np.random.randn(
        len(texts) if isinstance(texts, list) else 1,
        768
    ).astype(np.float32)
    mock.get_sentence_embedding_dimension.return_value = 768
    return mock


@pytest.fixture
def mock_reranker():
    """Mock CrossEncoder reranker."""
    import numpy as np

    mock = MagicMock()
    # Return deterministic scores for testing
    mock.predict.side_effect = lambda pairs: np.ones(len(pairs)) * 0.5
    return mock


@pytest.fixture
def mock_http_client():
    """Mock httpx AsyncClient for LLM calls."""
    mock = AsyncMock()
    mock.post.return_value = Mock(
        status_code=200,
        json=lambda: {
            "choices": [{"message": {"content": '["test requirement"]'}}]
        }
    )
    return mock


@pytest.fixture
def sample_chunks():
    """Sample text chunks for testing."""
    return [
        {"id": "chunk-1", "text": "The system shall support user authentication", "start_offset": 0, "end_offset": 45},
        {"id": "chunk-2", "text": "Users should be able to log in quickly", "start_offset": 46, "end_offset": 84},
        {"id": "chunk-3", "text": "TBD: Define exact timeout values", "start_offset": 85, "end_offset": 118},
    ]


@pytest.fixture
def sample_entries():
    """Sample entries for indexing tests."""
    return [
        {
            "entry_id": "entry-1",
            "entry_name": "Authentication Guide",
            "content": "# Authentication\n\nThis document covers user authentication.\n\n## OAuth Setup\n\nConfigure OAuth provider.",
            "archive_id": "archive-1",
            "tome_id": "tome-1",
        },
        {
            "entry_id": "entry-2",
            "entry_name": "API Reference",
            "content": "# API Reference\n\n## Endpoints\n\n- POST /login\n- GET /user\n- DELETE /session",
            "archive_id": "archive-1",
            "tome_id": "tome-2",
        },
    ]


@pytest.fixture
def app_client():
    """FastAPI test client with mocked dependencies."""
    from fastapi.testclient import TestClient

    # Import with mocked dependencies
    with patch("deps.client") as mock_qdrant, \
         patch("deps.get_embedder") as mock_emb_fn, \
         patch("deps.get_reranker") as mock_rerank_fn:

        # Set up mocks
        mock_qdrant.get_collections.return_value = Mock(collections=[])
        mock_qdrant.get_collection.return_value = Mock(points_count=0)
        mock_qdrant.search.return_value = []

        import numpy as np
        mock_embedder = MagicMock()
        mock_embedder.encode.side_effect = lambda texts, **kwargs: np.random.randn(
            len(texts) if isinstance(texts, list) else 1, 768
        ).astype(np.float32)
        mock_embedder.get_sentence_embedding_dimension.return_value = 768
        mock_emb_fn.return_value = mock_embedder

        mock_reranker = MagicMock()
        mock_reranker.predict.side_effect = lambda pairs: np.ones(len(pairs)) * 0.5
        mock_rerank_fn.return_value = mock_reranker

        from main import app
        client = TestClient(app)
        yield client
