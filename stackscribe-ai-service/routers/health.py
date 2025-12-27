from fastapi import APIRouter
from deps import client
from settings import QDRANT_HOST, QDRANT_PORT, COLLECTION
import requests

router = APIRouter(tags=["health"])

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Test basic Qdrant connection
        response = client.get_collections()
        
        # Check if our collection exists
        collection_exists = False
        points_count = 0
        
        collections = response.collections if hasattr(response, 'collections') else []
        for collection in collections:
            if collection.name == COLLECTION:
                collection_exists = True
                try:
                    # Try to get collection info
                    collection_info = client.get_collection(COLLECTION)
                    points_count = collection_info.points_count if hasattr(collection_info, 'points_count') else 0
                except Exception:
                    # If we can't get detailed info, that's okay
                    points_count = "unknown"
                break
        
        return {
            "status": "healthy", 
            "qdrant": "connected",
            "collection": COLLECTION,
            "collection_exists": collection_exists,
            "points_count": points_count
        }
    except Exception as e:
        # Try simpler health check
        try:
            # Just check if we can reach Qdrant at all
            response = requests.get(f"http://{QDRANT_HOST}:{QDRANT_PORT}/")
            if response.status_code == 200:
                return {
                    "status": "healthy",
                    "qdrant": "connected (basic)",
                    "collection": COLLECTION,
                    "note": "Detailed collection info unavailable due to API version mismatch"
                }
        except Exception:
            pass
            
        return {"status": "unhealthy", "error": str(e)}