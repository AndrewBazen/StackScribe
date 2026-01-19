import os
import httpx
from sentence_transformers import SentenceTransformer, CrossEncoder
from qdrant_client import QdrantClient, models
from settings import EMBED_MODEL, RERANKER_ID, QDRANT_HOST, QDRANT_PORT, COLLECTION
from functools import lru_cache
from typing import Optional
import redis

# ---------- Device selection for GPU acceleration ----------
TORCH_DEVICE = os.getenv("TORCH_DEVICE", "cpu")

# ---------- Lazy loading for faster startup ----------
_embedder: Optional[SentenceTransformer] = None
_reranker: Optional[CrossEncoder] = None


def get_embedder() -> SentenceTransformer:
    """Lazy-load embedder on first use (GPU-accelerated if available)."""
    global _embedder
    if _embedder is None:
        print(f"🔄 Loading embedder on device: {TORCH_DEVICE}")
        _embedder = SentenceTransformer(EMBED_MODEL, trust_remote_code=True, device=TORCH_DEVICE)
        print(f"✅ Embedder loaded: {EMBED_MODEL}")
    return _embedder


def get_reranker() -> CrossEncoder:
    """Lazy-load reranker on first use (GPU-accelerated if available)."""
    global _reranker
    if _reranker is None:
        print(f"🔄 Loading reranker on device: {TORCH_DEVICE}")
        _reranker = CrossEncoder(RERANKER_ID, device=TORCH_DEVICE)
        print(f"✅ Reranker loaded: {RERANKER_ID}")
    return _reranker


# Backward-compatible module-level access (lazy singletons)
# These are accessed as deps.embedder / deps.reranker in some code
class _LazyLoader:
    """Lazy loader that defers model loading until first access."""

    def __init__(self, loader_func):
        self._loader = loader_func
        self._instance = None

    def __call__(self):
        if self._instance is None:
            self._instance = self._loader()
        return self._instance

    def __getattr__(self, name):
        # Delegate attribute access to the loaded instance
        return getattr(self(), name)


# These can be used as deps.embedder.encode(...) or deps.get_embedder().encode(...)
embedder = _LazyLoader(get_embedder)
reranker = _LazyLoader(get_reranker)


# ---------- Qdrant client ----------
client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)

# ---------- Shared HTTP client for LLM calls (connection pooling) ----------
_http_client: Optional[httpx.AsyncClient] = None


def get_http_client() -> httpx.AsyncClient:
    """Get shared async HTTP client with connection pooling."""
    global _http_client
    if _http_client is None:
        _http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(120.0, connect=10.0),
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
        )
    return _http_client


async def close_http_client():
    """Close HTTP client on shutdown."""
    global _http_client
    if _http_client is not None:
        await _http_client.aclose()
        _http_client = None


# ---------- Redis client for persistent cache ----------
_redis_client: Optional[redis.Redis] = None
REDIS_URL = os.getenv("REDIS_URL", "")


def get_redis() -> Optional[redis.Redis]:
    """Get Redis client for caching (returns None if not configured)."""
    global _redis_client
    if not REDIS_URL:
        return None
    if _redis_client is None:
        try:
            _redis_client = redis.from_url(REDIS_URL, decode_responses=False)
            _redis_client.ping()
            print(f"✅ Redis connected: {REDIS_URL}")
        except Exception as e:
            print(f"⚠️ Redis unavailable, falling back to in-memory cache: {e}")
            return None
    return _redis_client


# ---------- Initialize collection ----------
async def ensure_collection_exists():
    """Ensure the note_chunks collection exists in Qdrant"""
    # Trigger lazy loading of embedder to get embedding dimension
    emb = get_embedder()
    try:
        # Try to get collection info
        client.get_collection(COLLECTION)
        print(f"✅ Collection '{COLLECTION}' already exists")
    except Exception as e:
        print(f"📝 Creating collection '{COLLECTION}'...")
        try:
            # Create collection with appropriate vector size
            client.create_collection(
                collection_name=COLLECTION,
                vectors_config=models.VectorParams(
                    size=emb.get_sentence_embedding_dimension(),
                    distance=models.Distance.COSINE
                )
            )
            print(f"✅ Collection '{COLLECTION}' created successfully")
        except Exception as create_error:
            print(f"❌ Failed to create collection: {create_error}")