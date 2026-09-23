"""
Main script entrypoint for running agent-backend directly.
"""

import sys
from pathlib import Path

# Add src to python path for direct execution
src_dir = Path(__file__).parent / "src"
if str(src_dir) not in sys.path:
    sys.path.insert(0, str(src_dir))

import uvicorn
from agent_backend.config import settings

if __name__ == "__main__":
    uvicorn.run(
        "agent_backend.main:app",
        host=settings.host,
        port=settings.port,
        reload=True
    )
