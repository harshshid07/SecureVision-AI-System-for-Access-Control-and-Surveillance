"""
FastAPI main application for SecureVision
Entry point for the backend API server
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings

# Import routes
from routes import auth, user, admin

# Create FastAPI app
app = FastAPI(
    title="SecureVision API",
    description="Enterprise-grade facial recognition authentication system",
    version="1.0.0"
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


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "SecureVision API is running",
        "version": "1.0.0",
        "status": "healthy"
    }


@app.get("/health")
async def health_check():
    """Health check for monitoring"""
    return {
        "status": "healthy",
        "timestamp": "2026-01-29T22:56:43Z"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=True
    )
