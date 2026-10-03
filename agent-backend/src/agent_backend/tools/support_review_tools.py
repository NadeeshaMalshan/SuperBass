"""
Support and Review Tools backed by Workio MCP Server.
Equips the Support & Review Agent to handle ratings, post-job reviews, dispute resolution,
worker performance metrics, profile lookups, and human support escalation.
"""

import logging
import uuid
from typing import Optional, Dict, Any
from langchain_core.tools import tool
from langchain_core.runnables.config import RunnableConfig
from agent_backend.tools.community_tools import sanitize_payload
from agent_backend.tools.mcp_client import mcp_client

logger = logging.getLogger("agent_backend.support_review_tools")


@tool
async def create_worker_review(
    bookingId: str,
    workerId: str,
    residentId: str,
    rating: int,
    comment: Optional[str] = None
) -> Dict[str, Any]:
    """
    Submits a formal review and star rating for a worker after job completion via the MCP Server.
    
    MCP Tool: create_worker_review
    Arguments:
    - bookingId (string, required): The associated booking ID.
    - workerId (string, required): The unique identifier of the worker.
    - residentId (string, required): The resident ID or email submitting the review.
    - rating (integer, required): Star rating between 1 and 5.
    - comment (string, optional): Additional review comments/feedback.
    """
    if not (1 <= rating <= 5):
        return {"status": "error", "message": "Rating must be an integer between 1 and 5."}

    args = {
        "bookingId": str(bookingId).strip(),
        "workerId": str(workerId).strip(),
        "residentId": str(residentId).strip(),
        "rating": int(rating),
        "comment": str(comment).strip() if comment else None
    }

    try:
        raw = await mcp_client.call_tool("create_worker_review", args)
        return sanitize_payload(raw)
    except Exception as e:
        return {"status": "error", "message": f"Failed to submit worker review: {str(e)}"}


@tool
async def get_worker_performance(workerId: str) -> Dict[str, Any]:
    """
    Retrieve performance metrics, overall rating, and completion stats for a worker.
    Useful for resolving disputes or reviewing quality of work.
    
    MCP Tool: get_worker_performance
    Arguments:
    - workerId (string, required): The unique identifier of the worker.
    """
    args = {"workerId": str(workerId).strip()}
    try:
        raw = await mcp_client.call_tool("get_worker_performance", args)
        return sanitize_payload(raw)
    except Exception as e:
        return {"status": "error", "message": f"Failed to fetch worker performance: {str(e)}"}


@tool
async def get_user_details(email: str) -> Dict[str, Any]:
    """
    Retrieve user profile and account details (role, contact info, status) by email address.
    
    MCP Tool: get_user_details
    Arguments:
    - email (string, required): User email address.
    """
    args = {"email": str(email).strip()}
    try:
        raw = await mcp_client.call_tool("get_user_details", args)
        return sanitize_payload(raw)
    except Exception as e:
        return {"status": "error", "message": f"Failed to fetch user details: {str(e)}"}


@tool
async def file_dispute_ticket(
    worker_id: str,
    reason: str,
    urgency_level: str,
    config: Optional[RunnableConfig] = None
) -> Dict[str, Any]:
    """
    Files a formal dispute ticket against a worker for incomplete jobs, damages, or financial disputes.
    Arguments:
    - worker_id (string, required): The worker identifier.
    - reason (string, required): Summary of the complaint or dispute.
    - urgency_level (string, required): 'low', 'medium', or 'high'.
    """
    safe_urgency = str(urgency_level).strip().lower()
    if safe_urgency not in ["low", "medium", "high"]:
        safe_urgency = "medium"

    args = {
        "worker_id": str(worker_id).strip(),
        "reason": str(reason).strip(),
        "urgency_level": safe_urgency
    }

    try:
        raw = await mcp_client.call_tool("file_dispute_ticket", args)
        return sanitize_payload(raw)
    except Exception as e:
        return {"status": "error", "message": f"Failed to file dispute: {str(e)}"}


@tool
async def escalate_to_human(
    reason: str,
    urgency: str = "medium"
) -> Dict[str, Any]:
    """
    Escalates the issue to a human support agent when the user is unsatisfied or facing critical issues.
    Arguments:
    - reason (string, required): Why human intervention is required.
    - urgency (string, optional): 'low', 'medium', or 'high'.
    """
    args = {"reason": reason, "urgency": urgency}
    try:
        raw = await mcp_client.call_tool("escalate_to_human", args)
        return sanitize_payload(raw)
    except Exception as e:
        return {"status": "error", "message": f"Failed to escalate: {str(e)}"}


from agent_backend.tools.booking_tools import get_resident_bookings


@tool
async def get_user_job_history(email: Optional[str] = None, limit: Optional[int] = 5) -> Dict[str, Any]:
    """
    Fetches the recent job history for the authenticated user to help identify past workers or bookings.
    Arguments:
    - email (string, optional): Resident email address.
    - limit (integer, optional): Number of past jobs to fetch (default: 5).
    """
    args: Dict[str, Any] = {"limit": min(limit, 20)} if limit else {"limit": 5}
    if email:
        args["email"] = email
    try:
        raw = await mcp_client.call_tool("get_user_job_history", args)
        return sanitize_payload(raw)
    except Exception as e:
        return {"status": "error", "message": f"Failed to fetch job history: {str(e)}"}


@tool
async def lookup_platform_policy(
    query: str,
    category: Optional[str] = None
) -> Dict[str, Any]:
    """
    Retrieves verified platform rules, cancellation policies, warranties, guarantees, and pricing guidelines
    from the Workio RAG Knowledge Base.
    Arguments:
    - query (string, required): Specific policy inquiry or question (e.g. 'cancellation fee', '7 day warranty', 'technician vetting').
    - category (string, optional): Specific category filter (e.g. 'Cancellation', 'Warranties', 'Pricing', 'Safety', 'Disputes').
    """
    from agent_backend.knowledge.policy_retriever import policy_retriever
    try:
        results = await policy_retriever.search(query=query, top_k=2, category=category)
        if not results:
            return {
                "status": "not_found",
                "message": f"No specific policy documentation found for query: '{query}'. Please refer to platform hotline (+94 11 234 5678)."
            }
        return {
            "status": "success",
            "query": query,
            "matched_policies": results
        }
    except Exception as e:
        logger.error(f"RAG search failed: {e}")
        return {"status": "error", "message": f"Failed to retrieve policy: {str(e)}"}


SUPPORT_REVIEW_TOOLS = [
    lookup_platform_policy,
    get_resident_bookings,
    get_user_job_history,
    create_worker_review,
    get_worker_performance,
    get_user_details,
    file_dispute_ticket,
    escalate_to_human
]

# Aliases for backward compatibility
SUPPORT_TOOLS = SUPPORT_REVIEW_TOOLS
REVIEW_TOOLS = SUPPORT_REVIEW_TOOLS