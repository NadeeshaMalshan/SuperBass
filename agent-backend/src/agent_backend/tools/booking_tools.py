from typing import Dict, Any, Optional
from langchain_core.tools import tool
from agent_backend.tools.mcp_client import mcp_client
from agent_backend.tools.community_tools import sanitize_payload

@tool
async def check_worker_availability(workerId: str, startTime: str, endTime: str) -> Dict[str,Any]:
    """Check if a worker is available for a specified time window."""
    result = await mcp_client.call_tool(
        "check_worker_availability", {"workerId": workerId, "startTime": startTime, "endTime": endTime})
    return sanitize_payload(result)

@tool
async def create_booking(
    workerId: str,
    residentId: str,
    startTime: str,
    endTime: str,
    jobTitle: str,
    locationAddress: str,
    contactPhone: str,
    notes: Optional[str] = None
) -> Dict[str, Any]: 
    """
    Create a new service booking request after user has explicitly confirmed.
    Requires workerId, residentId, startTime, endTime, jobTitle, locationAddress, and contactPhone.
    """
    result = await mcp_client.call_tool(
        "create_booking",
        {
            "workerId": workerId,
            "residentId": residentId,
            "startTime": startTime,
            "endTime": endTime,
            "jobTitle": jobTitle,
            "notes": notes or jobTitle,
            "locationAddress": locationAddress,
            "contactPhone": contactPhone
        }
    )
    return sanitize_payload(result)
BOOKING_TOOLS= [check_worker_availability, create_booking]
