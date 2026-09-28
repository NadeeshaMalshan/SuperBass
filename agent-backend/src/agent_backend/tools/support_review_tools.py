from langchain_core.tools import tool
from typing import Optional, Dict, Any
from agent_backend.tools.community_tools import sanitize_payload
from agent_backend.tools.mcp_client import mcp_client
import uuid 
from langchain_core.runnables.config import RunnableConfig

@tool
async def get_user_job_history(limit: Optional[int] = 5) -> Dict[str, Any]:
    """
    Fetches the recent job history for the authenticated user.
    
    Use this tool when the user wants to review or dispute a worker but doesn't 
    know the worker's exact name or ID. Present the recent jobs to the user 
    to help them identify the correct worker.
    
    MCP Tool: get_user_job_history
    Arguments:
    - limit (integer, optional): The number of recent jobs to fetch. Defaults to 5.
    """
    args = {"limit": min(limit, 20)} if limit else {"limit": 5}
    
    try:
        raw = await mcp_client.call_tool("get_user_job_history", args)
        return sanitize_payload(raw)
    except Exception as e:
        return {"status": "error", "message": f"Failed to fetch job history: {str(e)}"}

@tool
async def submit_worker_review(
    worker_id: str, 
    rating: int, 
    comment: Optional[str] = None
) -> Dict[str, Any]:
    """
    Submits a review for a worker after a job is completed via the MCP Server.
    
    Use this tool ONLY when the user has explicitly provided a star rating (1 to 5) 
    and identified the worker. Do not guess the rating.

    MCP Tool: submit_worker_review
    Arguments:
    - worker_id (string, required): The unique identifier of the worker.
    - rating (integer, required): Star rating between 1 and 5.
    - comment (string, optional): Additional text review from the user.
    """
    # 1. Validation
    if not (1 <= rating <= 5):
        return {"status": "error", "message": "Rating must be between 1 and 5."}
    
    # 2. Argument Sanitization
    args = {
        "worker_id": str(worker_id).strip(),
        "rating": int(rating),
        "comment": str(comment).strip() if comment else None
    }
    
    # 3. Call the MCP Server
    try:
        raw = await mcp_client.call_tool("submit_worker_review", args)
        return sanitize_payload(raw)
    except Exception as e:
        return {"status": "error", "message": f"Failed to submit review: {str(e)}"}


@tool
async def search_workers(query: str) -> Dict[str, Any]:
    """
    Searches for a worker by name, profession, or recent job to retrieve their worker_id.
    
    Use this tool BEFORE calling submit_worker_review if the user mentions a worker 
    by name. 
    
    CRITICAL: If this tool returns multiple workers, you MUST stop and ask the 
    user to clarify which worker they meant based on the returned professions or dates. 
    Do not guess the worker_id.
    
    MCP Tool: search_workers
    Arguments:
    - query (string, required): The name, profession, or keywords to search.
    """
    args = {"query": str(query).strip()}
    
    try:
        raw = await mcp_client.call_tool("search_workers", args)
        return sanitize_payload(raw)
    except Exception as e:
        return {"status": "error", "message": f"Failed to search for workers: {str(e)}"}


@tool
async def file_dispute_ticket(
    worker_id: str, 
    reason: str, 
    urgency_level: str,
    config: RunnableConfig
) -> Dict[str, Any]:
    """
    Files a formal dispute ticket against a worker via the MCP Server.
    
    Use this tool when a user expresses serious dissatisfaction, safety concerns, 
    or financial disagreement regarding a job. 
    
    MCP Tool: file_dispute_ticket
    Arguments:
    - worker_id (string, required): The unique identifier of the worker being reported.
    - reason (string, required): A concise summary of the user's complaint.
    - urgency_level (string, required): Must be strictly 'low', 'medium', or 'high' based on severity.
    """
    safe_urgency = str(urgency_level).strip().lower()
    if safe_urgency not in ["low", "medium", "high"]:
        return {"status": "error", "message": "urgency_level must be 'low', 'medium', or 'high'."}
        
    args = {
        "worker_id": str(worker_id).strip(),
        "reason": str(reason).strip(),
        "urgency_level": safe_urgency
    }
    
    idempotency_key = str(uuid.uuid4())
    run_id = str(config.get("run_id", "unknown_run_id"))
    metadata = {
        "x-idempotency-key": idempotency_key,
        "x-ai-trace-id": run_id
    }
    
    try:
        # Standard signature for MCP Tool execution with metadata
        args["_metadata"] = metadata
        raw = await mcp_client.call_tool("file_dispute_ticket", args)
        return sanitize_payload(raw)
    except Exception as e:
        return {"status": "error", "message": f"Failed to file dispute ticket: {str(e)}"}

@tool
async def escalate_to_human(
    reason: str,
    urgency: str
) -> Dict[str, Any]:
    """
    Escalates the current conversation to a human support agent.
    
    Call this tool immediately if the user is irate, threatens self-harm, 
    explicitly requests a human, or if you cannot resolve their issue. 
    
    Arguments:
    - reason (string, required): A brief summary of why the user needs a human.
    - urgency (string, required): 'low', 'medium', or 'high'. Use 'high' for safety threats.
    """
    args = {"reason": reason, "urgency": urgency}
    
    try:
        raw = await mcp_client.call_tool("escalate_to_human", args)
        return sanitize_payload(raw)
    except Exception as e:
        return {"status": "error", "message": f"Failed to escalate: {str(e)}"}

REVIEW_TOOLS = [submit_worker_review, search_workers]
SUPPORT_TOOLS = [file_dispute_ticket, escalate_to_human, get_user_job_history]