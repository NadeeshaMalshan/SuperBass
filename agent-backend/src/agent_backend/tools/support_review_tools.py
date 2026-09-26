from langchain_core.tools import tool
from typing import Optional

@tool
def submit_worker_review(worker_id: str, rating: int, comment: Optional[str] = None) -> dict:
    """
    Submits a review for a worker after a job is completed.
    
    Use this tool ONLY when the user has explicitly provided a star rating (1 to 5) 
    and identified the worker. Do not guess the rating.
    """
    # 1. Validation (Optional but good practice)
    if not (1 <= rating <= 5):
        return {"status": "error", "message": "Rating must be between 1 and 5."}
    
    # 2. Call the MCP Server
    # Note: Replace `mcp_client` with however your team currently calls the MCP server.
    # It usually looks like a JSON-RPC or REST call.
    payload = {
        "worker_id": worker_id,
        "rating": rating,
        "comment": comment
    }
    
    try:
        # Example: response = mcp_client.execute("submit_review", payload)
        # Mocking the success response for this example:
        response = {"status": "success", "review_id": "rev_789", "message": "Review submitted securely."}
        return response
    except Exception as e:
        return {"status": "error", "message": str(e)}