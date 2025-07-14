import os
from pathlib import Path
import re, uuid, nltk, markdown, sqlite3
from nltk.tokenize import sent_tokenize
from qdrant_client import QdrantClient, models
from sentence_transformers import SentenceTransformer
from tqdm import tqdm

# ------------------- CONFIG -------------------
# Database path - check if we're running in Docker
if os.path.exists("/app/stackscribe.db"):
    DATABASE_PATH = "/app/stackscribe.db"  # Docker container path
else:
    DATABASE_PATH = "/Users/andrewbazen/Library/Application Support/com.stackscribe.app/stackscribe.db"  # Local path
    
COLLECTION    = "note_chunks"
EMBED_MODEL   = "nomic-ai/nomic-embed-text-v1"
CHUNK_TOKENS  = 200
BATCH_SIZE    = 1_000

# Qdrant connection config - use environment variables if available
QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", "6333"))
# ----------------------------------------------

nltk.download("punkt")

embedder = SentenceTransformer(EMBED_MODEL, trust_remote_code=True)
client   = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)

# Create collection if it doesn't exist, otherwise get existing one
try:
    # Try to get collection info (this will fail if collection doesn't exist)
    collection_info = client.get_collection(COLLECTION)
    print(f"✅ Collection '{COLLECTION}' already exists")
except Exception as e:
    try:
        print(f"📝 Creating collection '{COLLECTION}'...")
        client.create_collection(
            collection_name=COLLECTION,
            vectors_config=models.VectorParams(
                size=embedder.get_sentence_embedding_dimension(),
                distance=models.Distance.COSINE
            )
        )
        print(f"✅ Collection '{COLLECTION}' created successfully")
    except Exception as create_error:
        # Collection might already exist, which is fine
        if "already exists" in str(create_error):
            print(f"✅ Collection '{COLLECTION}' already exists")
        else:
            print(f"❌ Error creating collection: {create_error}")
            # Continue anyway, the collection might still be usable

def content_to_chunks(content: str):
    """Yield ~CHUNK_TOKENS-sized plain-text chunks from entry content."""
    # If content is markdown, convert to HTML then strip tags
    if content.strip().startswith('#') or '**' in content or '*' in content:
        html = markdown.markdown(content)
        text = re.sub(r"<[^>]+>", "", html)  # strip HTML tags
    else:
        text = content
    
    sents = sum((sent_tokenize(p) for p in text.splitlines()), [])
    buf, tokens = [], 0
    for s in sents:
        t = s.split()
        tokens += len(t); buf.append(s)
        if tokens >= CHUNK_TOKENS:
            yield " ".join(buf)
            buf, tokens = [], 0
    if buf:
        yield " ".join(buf)

def get_entries_from_db():
    """Get all entries from the StackScribe SQLite database."""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # Query all entries with their tome and archive info for better context
    query = """
    SELECT 
        e.id,
        e.name,
        e.content,
        t.name as tome_name,
        a.name as archive_name
    FROM entries e
    JOIN tomes t ON e.tome_id = t.id
    JOIN archives a ON t.archive_id = a.id
    ORDER BY a.name, t.name, e.name
    """
    
    cursor.execute(query)
    entries = cursor.fetchall()
    conn.close()
    
    return entries

def make_point(note_name: str, chunk_id: int, text: str):
    return models.PointStruct(
        id=str(uuid.uuid4()),
        payload={"note": note_name, "chunk_id": chunk_id, "text": text},
        vector=embedder.encode(f"passage: {text}", normalize_embeddings=True)
    )

batch, total = [], 0

# Get all entries from the database
entries = get_entries_from_db()
print(f"Found {len(entries)} entries in database")

for entry_id, entry_name, content, tome_name, archive_name in tqdm(entries, desc="Indexing entries"):
    # Create a descriptive note name that includes context
    note_name = f"{archive_name}/{tome_name}/{entry_name}"
    
    # Process content into chunks
    for idx, chunk in enumerate(content_to_chunks(content)):
        batch.append(make_point(note_name, idx, chunk))
        if len(batch) >= BATCH_SIZE:
            client.upsert(collection_name=COLLECTION, points=batch)
            total += len(batch)
            batch.clear()

# flush remainder
if batch:
    client.upsert(collection_name=COLLECTION, points=batch)
    total += len(batch)

print(f"Indexed {total} chunks from {len(entries)} entries into Qdrant ✨")