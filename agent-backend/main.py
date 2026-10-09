"""
Main script entrypoint for running agent-backend directly and for Vercel deployment.
"""

import sys
from pathlib import Path

# Add src to python path for direct execution and serverless imports
src_dir = Path(__file__).resolve().parent / "src"
if str(src_dir) not in sys.path:
    sys.path.insert(0, str(src_dir))

import uvicorn
from agent_backend.config import settings
from agent_backend.main import app

if __name__ == "__main__":
    uvicorn.run(
        "agent_backend.main:app",
        host=settings.host,
        port=settings.port,
        reload=True
    )

