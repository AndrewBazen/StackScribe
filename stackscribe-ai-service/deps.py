from sentence_transformers import SentenceTransformer, CrossEncoder
from qdrant_client import QdrantClient, models
from settings import EMBED_MODEL, RERANKER_ID, QDRANT_HOST, QDRANT_PORT, COLLECTION

# ---------- Heavy objects (load once) ----------
embedder  = SentenceTransformer(EMBED_MODEL, trust_remote_code=True)
reranker  = CrossEncoder(RERANKER_ID)
client    = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)

# ---------- Initialize collection ----------
async def ensure_collection_exists():
    """Ensure the note_chunks collection exists in Qdrant"""
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
                    size=embedder.get_sentence_embedding_dimension(),
                    distance=models.Distance.COSINE
                )
            )
            print(f"✅ Collection '{COLLECTION}' created successfully")
        except Exception as create_error:
            print(f"❌ Failed to create collection: {create_error}")