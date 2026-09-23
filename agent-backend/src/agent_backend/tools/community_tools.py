"""
Community and User Management Tools backed by SuperBass MCP Server.
Each LangChain tool routes its execution through JSON-RPC 2.0 to the MCP Server.
"""

from typing import Optional, Dict, Any, Union
from langchain_core.tools import tool
from agent_backend.tools.mcp_client import mcp_client


@tool
async def create_community_post(
    authorId: str,
    title: str,
    content: str,
    communityId: str = "General",
    location: str = "Colombo"
) -> Dict[str, Any]:
    """
    Publish a new community post via the MCP Server.

    MCP Tool: create_community_post
    Arguments:
    - authorId (string, required): Author user ID or email
    - title (string, required): Post title
    - content (string, required): Post body content
    - communityId (string, required): Category or community identifier (e.g., 'General', 'Electrical')
    - location (string, optional): Service location (default: 'Colombo')
    """
    args = {
        "authorId": authorId,
        "title": title,
        "content": content,
        "communityId": communityId or "General",
        "location": location or "Colombo"
    }
    return await mcp_client.call_tool("create_community_post", args)


@tool
async def get_community_posts(
    communityId: str = "All",
    limit: Optional[int] = 10,
    offset: Optional[int] = 0
) -> Dict[str, Any]:
    """
    List community posts with optional category filtering and pagination via the MCP Server.

    MCP Tool: get_community_posts
    Arguments:
    - communityId (string, required): Category filter (e.g., 'General', 'Plumbing', 'All') or numeric post ID
    - limit (integer, optional): Maximum number of posts to return (default: 10)
    - offset (integer, optional): Pagination offset (default: 0)
    """
    args: Dict[str, Any] = {
        "communityId": str(communityId or "All")
    }
    if limit is not None:
        args["limit"] = limit
    if offset is not None:
        args["offset"] = offset

    return await mcp_client.call_tool("get_community_posts", args)


@tool
async def update_community_post(
    postId: Union[int, str],
    title: str,
    content: str,
    communityId: Optional[str] = "General",
    location: Optional[str] = "Colombo",
    authorId: Optional[str] = None
) -> Dict[str, Any]:
    """
    Update an existing community post with author authorization via the MCP Server.

    MCP Tool: update_community_post
    Arguments:
    - postId (integer/string, required): ID of the post to update
    - title (string, required): New title
    - content (string, required): New content
    - communityId (string, optional): Category ID (default: 'General')
    - location (string, optional): Location (default: 'Colombo')
    - authorId (string, optional): Author ID or email for verification
    """
    args: Dict[str, Any] = {
        "postId": int(postId) if str(postId).isdigit() else postId,
        "title": title,
        "content": content,
        "communityId": communityId or "General",
        "location": location or "Colombo"
    }
    if authorId:
        args["authorId"] = authorId

    return await mcp_client.call_tool("update_community_post", args)


@tool
async def delete_community_post(
    postId: Union[int, str],
    authorId: Optional[str] = None
) -> Dict[str, Any]:
    """
    Soft-delete an existing community post (status updated to 'Removed') via the MCP Server.

    MCP Tool: delete_community_post
    Arguments:
    - postId (integer/string, required): ID of the post to delete
    - authorId (string, optional): Author ID or email for verification
    """
    args: Dict[str, Any] = {
        "postId": int(postId) if str(postId).isdigit() else postId
    }
    if authorId:
        args["authorId"] = authorId

    return await mcp_client.call_tool("delete_community_post", args)


@tool
async def get_user_community_posts(
    email: str
) -> Dict[str, Any]:
    """
    Retrieve all community posts published by a specific user via the MCP Server.

    MCP Tool: get_user_community_posts
    Arguments:
    - email (string, required): User email address or user ID (e.g., 'kpjmp28@gmail.com')
    """
    args = {"email": str(email).strip()}
    return await mcp_client.call_tool("get_user_community_posts", args)


@tool
async def get_user_details(
    email: str
) -> Dict[str, Any]:
    """
    Retrieve comprehensive user profile details (role, resident profile, contact info, worker stats and skills if applicable) by email address via the MCP Server.

    MCP Tool: get_user_details
    Arguments:
    - email (string, required): User email address (e.g., 'dampahalagevenuri@gmail.com', 'kpjmp28@gmail.com')
    Returns: Unified user object including role ('Worker' or 'Resident'), isWorker, contact details, resident profile, and full worker profile (if applicable) with password hashes securely stripped.
    """
    args = {"email": str(email).strip()}
    return await mcp_client.call_tool("get_user_details", args)


COMMUNITY_TOOLS = [
    create_community_post,
    get_community_posts,
    update_community_post,
    delete_community_post,
    get_user_community_posts,
    get_user_details
]
