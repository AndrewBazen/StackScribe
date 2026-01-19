from fastapi import APIRouter, HTTPException
from typing import List
from lib.linking import suggest_links, LinkSuggestionRequest, LinkSuggestion, IndexEntriesRequest, batch_vector
from lib.chunking import chunk_text
from deps import client
from settings import COLLECTION
from qdrant_client import models
import uuid

router = APIRouter(prefix="/api", tags=["links"])

@router.post("/suggestions", response_model=List[LinkSuggestion])
async def get_suggestions(request: LinkSuggestionRequest):
    """Get AI-powered link suggestions with optimized scoring."""
    try:
        suggestions = suggest_links(request.text, request.current_entry_id)

        result = []
        for entry_id, entry_name, score in suggestions:
            result.append(LinkSuggestion(
                entry_id=entry_id,
                entry_name=entry_name,
                score=score,
                reasoning=f"Normalized score: {score:.1%} confidence"
            ))

        # If no suggestions found, return helpful message
        if not result:
            print(f"🔍 No suggestions above threshold for: '{request.text[:50]}...'")

        return result
    except Exception as e:
        print(f"❌ Error in get_suggestions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get suggestions: {str(e)}")


@router.post("/index_entries")
async def index_entries(request: IndexEntriesRequest):
    """
    Index (or re-index) entries into Qdrant with batch embedding.

    Optimizations:
    - Batch encodes all chunks at once (3-5x faster than one-by-one)
    - Deletes existing points before upserting new ones

    Behavior:
    - Deletes existing points for an entry_id
    - Chunks content and upserts new points
    """
    try:
        total_chunks = 0
        indexed_entries = 0

        # Collect all chunks and metadata for batch processing
        all_chunks = []
        chunk_metadata = []

        for entry in request.entries:
            entry_id = entry.entry_id.strip()
            if not entry_id:
                continue

            # Delete existing points for this entry_id
            try:
                client.delete(
                    collection_name=COLLECTION,
                    points_selector=models.FilterSelector(
                        filter=models.Filter(
                            must=[
                                models.FieldCondition(
                                    key="entry_id",
                                    match=models.MatchValue(value=entry_id),
                                )
                            ]
                        )
                    ),
                )
            except Exception as delete_err:
                # Non-fatal (e.g. older Qdrant versions / no matches)
                print(f"⚠️ Failed to delete existing points for {entry_id}: {delete_err}")

            chunks = chunk_text(entry.content)
            if not chunks:
                continue

            for idx, chunk in enumerate(chunks):
                all_chunks.append(chunk)
                chunk_metadata.append({
                    "entry_id": entry_id,
                    "entry_name": entry.entry_name,
                    "archive_id": entry.archive_id,
                    "tome_id": entry.tome_id,
                    "chunk_id": idx,
                    "text": chunk,
                })

            indexed_entries += 1

        if not all_chunks:
            return {
                "status": "ok",
                "indexed_entries": 0,
                "indexed_chunks": 0,
                "collection": COLLECTION,
            }

        # Batch encode all chunks at once (major performance improvement)
        print(f"🔄 Batch encoding {len(all_chunks)} chunks...")
        embeddings = batch_vector(all_chunks, is_query=False)

        # Create points with precomputed embeddings
        points = [
            models.PointStruct(
                id=str(uuid.uuid4()),
                payload=meta,
                vector=emb.tolist() if hasattr(emb, 'tolist') else emb,
            )
            for meta, emb in zip(chunk_metadata, embeddings)
        ]

        # Upsert in batches of 100 to avoid memory issues
        BATCH_SIZE = 100
        for i in range(0, len(points), BATCH_SIZE):
            batch = points[i:i + BATCH_SIZE]
            client.upsert(collection_name=COLLECTION, points=batch)

        total_chunks = len(points)
        print(f"✅ Indexed {total_chunks} chunks from {indexed_entries} entries")

        return {
            "status": "ok",
            "indexed_entries": indexed_entries,
            "indexed_chunks": total_chunks,
            "collection": COLLECTION,
        }
    except Exception as e:
        print(f"❌ Error in index_entries: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to index entries: {str(e)}")
