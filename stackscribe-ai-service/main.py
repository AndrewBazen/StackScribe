from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import health, links, quality
from deps import ensure_collection_exists


# ---------- FastAPI app ----------
app = FastAPI(title="StackScribe AI Link Service")

# Add CORS middleware to allow requests from Tauri app and web clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:1420", "https://tauri.localhost", "tauri://localhost", "*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Initialize collection on FastAPI startup"""
    await ensure_collection_exists()

# Add routers
app.include_router(health.router)
app.include_router(links.router)
app.include_router(quality.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 