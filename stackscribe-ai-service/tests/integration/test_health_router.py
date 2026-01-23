"""Integration tests for health check endpoint.

Note: These tests require the full AI service dependencies to be installed.
They are skipped if dependencies are not available.
"""
import pytest
from unittest.mock import Mock, MagicMock, patch

# Check if heavy dependencies are available
try:
    import sentence_transformers
    import qdrant_client
    DEPS_AVAILABLE = True
except ImportError:
    DEPS_AVAILABLE = False

requires_deps = pytest.mark.skipif(
    not DEPS_AVAILABLE,
    reason="Requires sentence_transformers and qdrant_client"
)


@requires_deps
class TestHealthEndpoint:
    """Tests for /health endpoint."""

    def test_health_returns_healthy_status(self):
        """Test that health endpoint returns healthy status when Qdrant is available."""
        import numpy as np

        with patch("deps.client") as mock_qdrant, \
             patch("deps.get_embedder") as mock_emb_fn, \
             patch("deps.get_reranker") as mock_rerank_fn, \
             patch("deps.ensure_collection_exists"):

            # Set up Qdrant mock
            mock_collection = Mock()
            mock_collection.points_count = 100
            mock_qdrant.get_collection.return_value = mock_collection
            mock_qdrant.get_collections.return_value = Mock(collections=[Mock(name="note_chunks")])

            # Set up embedder mock
            mock_embedder = MagicMock()
            mock_embedder.encode.return_value = np.zeros((1, 768))
            mock_embedder.get_sentence_embedding_dimension.return_value = 768
            mock_emb_fn.return_value = mock_embedder

            # Set up reranker mock
            mock_reranker = MagicMock()
            mock_reranker.predict.return_value = np.array([0.5])
            mock_rerank_fn.return_value = mock_reranker

            from fastapi.testclient import TestClient
            from main import app

            client = TestClient(app)
            response = client.get("/health")

            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"
            assert "qdrant" in data

    def test_health_returns_points_count(self):
        """Test that health endpoint returns vector count from Qdrant."""
        import numpy as np

        with patch("deps.client") as mock_qdrant, \
             patch("deps.get_embedder") as mock_emb_fn, \
             patch("deps.get_reranker") as mock_rerank_fn, \
             patch("deps.ensure_collection_exists"):

            # Set up Qdrant mock with specific point count
            mock_collection = Mock()
            mock_collection.points_count = 42
            mock_qdrant.get_collection.return_value = mock_collection
            mock_qdrant.get_collections.return_value = Mock(collections=[Mock(name="note_chunks")])

            # Set up embedder mock
            mock_embedder = MagicMock()
            mock_embedder.encode.return_value = np.zeros((1, 768))
            mock_embedder.get_sentence_embedding_dimension.return_value = 768
            mock_emb_fn.return_value = mock_embedder

            # Set up reranker mock
            mock_reranker = MagicMock()
            mock_reranker.predict.return_value = np.array([0.5])
            mock_rerank_fn.return_value = mock_reranker

            from fastapi.testclient import TestClient
            from main import app

            client = TestClient(app)
            response = client.get("/health")

            assert response.status_code == 200
            data = response.json()
            assert data["qdrant"]["vectors"] == 42
