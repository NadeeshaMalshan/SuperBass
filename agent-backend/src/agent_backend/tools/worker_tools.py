"""
Worker Tools for SuperBass Multi-Agent System.
Exposes Worker search, profile details, and performance metrics via MCP Client to LangChain.
"""

from typing import Dict, Any, Optional, Union
from langchain_core.tools import tool
from agent_backend.tools.mcp_client import mcp_client
from agent_backend.tools.community_tools import sanitize_payload


@tool
async def search_workers(
    skill: Optional[str] = None,
    location: Optional[str] = None,
    residentLat: Optional[float] = None,
    residentLng: Optional[float] = None
) -> Any:
    """
    Search for service workers by trade/skill, service location, or geographical coordinates.
    
    Arguments:
    - skill (optional): Service category or skill name (e.g., 'Plumbing', 'Electrician', 'Carpentry', 'AC Repair', 'Pipe Fitting').
    - location (optional): City, town, or primary service area (e.g., 'Malabe', 'Colombo', 'Kandy').
    - residentLat (optional): Resident's latitude for distance calculation.
    - residentLng (optional): Resident's longitude for distance calculation.
    
    Returns:
    List of worker objects matching the criteria, including name, services, hourlyRate, overallRating, distance, availability, and experience.
    """
    args: Dict[str, Any] = {}
    if skill:
        args["skill"] = skill.strip()
    if location:
        args["location"] = location.strip()
    if residentLat is not None:
        args["residentLat"] = residentLat
    if residentLng is not None:
        args["residentLng"] = residentLng

    raw = await mcp_client.call_tool("search_workers", args)
    return sanitize_payload(raw)


@tool
async def get_worker_details(
    workerId: Union[str, int]
) -> Dict[str, Any]:
    """
    Retrieve full profile and trade details for a specific worker by their worker ID.
    
    Arguments:
    - workerId (required): The unique integer or string ID of the worker.
    
    Returns:
    Complete worker record including contact info, service areas, rate/pricing model, full skills list, and ratings.
    """
    args = {"workerId": str(workerId).strip()}
    raw = await mcp_client.call_tool("get_worker_details", args)
    return sanitize_payload(raw)


@tool
async def get_worker_performance(
    workerId: Union[str, int]
) -> Dict[str, Any]:
    """
    Retrieve detailed performance metrics and reliability ratings for a specific worker.
    
    Arguments:
    - workerId (required): The unique integer or string ID of the worker.
    
    Returns:
    Performance breakdown including completed jobs, cancelled jobs, acceptance rate, completion rate, punctuality, quality, and communication ratings.
    """
    args = {"workerId": str(workerId).strip()}
    raw = await mcp_client.call_tool("get_worker_performance", args)
    return sanitize_payload(raw)


WORKER_TOOLS = [
    search_workers,
    get_worker_details,
    get_worker_performance
]
