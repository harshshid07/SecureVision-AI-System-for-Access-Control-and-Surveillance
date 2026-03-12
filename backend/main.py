"""
FastAPI main application for SecureVision
Entry point for the backend API server
"""
from fastapi import FastAPI  # type: ignore
from fastapi.middleware.cors import CORSMiddleware  # type: ignore
from config import settings  # type: ignore
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s"
)

# Import routes
from routes import auth, user, admin  # type: ignore
from routes.surveillance import router as surveillance_router  # type: ignore

# Create FastAPI app
app = FastAPI(
    title="SecureVision API",
    description="Enterprise-grade facial recognition + real-time surveillance system",
    version="2.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(auth.router)
app.include_router(user.router)
app.include_router(admin.router)
app.include_router(surveillance_router)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "SecureVision API is running",
        "version": "2.0.0",
        "status": "healthy",
        "modules": ["auth", "surveillance"]
    }


@app.get("/health")
async def health_check():
    """Health check for monitoring"""
    from surveillance_engine import engine_manager  # type: ignore
    return {
        "status": "healthy",
        "surveillance": engine_manager.get_status()
    }


if __name__ == "__main__":
    import uvicorn  # type: ignore
    uvicorn.run(
        "main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=True
    )

