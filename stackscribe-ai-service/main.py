from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from routers import health, links, quality, chat
from deps import ensure_collection_exists, close_http_client


# ---------- FastAPI app ----------
app = FastAPI(title="StackScribe AI Link Service")

# Add GZip compression for responses > 500 bytes (60-80% payload reduction)
app.add_middleware(GZipMiddleware, minimum_size=500)

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


@app.on_event("shutdown")
async def shutdown_event():
    """Clean up resources on shutdown"""
    await close_http_client()

# Add routers
app.include_router(health.router)
app.include_router(links.router)
app.include_router(quality.router)
app.include_router(chat.router)

if __name__ == "__main__":
    import uvicorn
    import sys

    # uvloop/httptools only work on Linux/Mac, not Windows
    if sys.platform == "win32":
        uvicorn.run(app, host="0.0.0.0", port=8000)
    else:
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=8000,
            loop="uvloop",        # Faster async event loop
            http="httptools",     # Faster HTTP parsing
        ) 