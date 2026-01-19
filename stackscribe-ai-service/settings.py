import os
import re
import spacy

# ---------- Global config ----------
# Threshold after sigmoid normalization (0-1 scale) - 80% confidence minimum
THRESHOLD   = float(os.getenv("THRESHOLD", "0.80"))
TOP_K       = int(os.getenv("TOP_K", "8"))
COLLECTION  = os.getenv("COLLECTION", "note_chunks")
EMBED_MODEL = os.getenv("EMBED_MODEL", "nomic-ai/nomic-embed-text-v1")
# Faster reranker model for lower latency
RERANKER_ID = os.getenv("RERANKER_ID", "cross-encoder/ms-marco-MiniLM-L-6-v2")
CHUNK_TOKENS = 200
BATCH_SIZE = 1_000

# ---------- Stopwords for code symbol filtering ----------
# Prevents matching common words like "the", "and", "for" in code_symbol_bonus
STOPWORDS = frozenset({
    "the", "and", "for", "with", "from", "this", "that", "have", "are", "was",
    "will", "can", "not", "all", "any", "but", "has", "had", "get", "set",
    "new", "use", "add", "end", "let", "var", "def", "class", "func", "void",
    "int", "str", "bool", "true", "false", "null", "none", "self", "return",
})

# ---------- Qdrant connection config ----------
QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", "6333"))

# ---------- Requirements generation config (OpenAI-compatible endpoints) ----------
REQ_LLM_BASE_URL = os.getenv("REQ_LLM_BASE_URL", "")
REQ_LLM_API_KEY = os.getenv("REQ_LLM_API_KEY", "local-api-key")
REQ_LLM_MODEL = os.getenv("REQ_LLM_MODEL", "llama3.1")
REQ_LLM_MAX_TOKENS = int(os.getenv("REQ_LLM_MAX_TOKENS", "800"))
REQ_LLM_TEMPERATURE = float(os.getenv("REQ_LLM_TEMPERATURE", "0.2"))

# -------- Ambiguity detection constants --------
VAGUE_TERMS = [
    "fast", "soon", "user-friendly", "easy", "simple", "robust", "reliable",
    "appropriate", "reasonable", "as needed", "as appropriate", "etc", "and so on",
]
QUANTIFIERS = ["some", "many", "few", "often", "usually", "sometimes", "generally", "various"]
TBD_TOKENS = ["tbd", "todo", "to-do", "fixme"]

# -------- Database constants --------
if os.path.exists("/app/stackscribe.db"):
    DATABASE_PATH = "/app/stackscribe.db"  # Docker container path
else:
    DATABASE_PATH = "/Users/andrewbazen/Library/Application Support/com.stackscribe.app/stackscribe.db"  # Local path
    
# ---------------- preload once ----------------
NER  = spacy.load("en_core_web_sm")
SYMBOL_RX = re.compile(r"```(\w+)?\n(.*?)```", re.S)