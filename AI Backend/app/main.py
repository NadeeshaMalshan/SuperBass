from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="SuperBass AI Backend",
    version="0.1.0",
    description="AI Services, LangGraph Agents & MCP Tools for SuperBass",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {
        "service": "SuperBass AI Backend",
        "status": "online",
        "version": "0.1.0",
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}
