"""
Booking and Appointment Management Tools backed by Workio MCP Server.
Equips the Booking Agent to handle end-to-end appointment scheduling, availability verification,
calendar management, rescheduling, and cancellations.
"""

import logging
import re
from datetime import datetime
from typing import Dict, Any, Optional, List
from langchain_core.tools import tool
from agent_backend.tools.mcp_client import mcp_client
from agent_backend.tools.community_tools import sanitize_payload
from agent_backend.tools.worker_matching_tools import (
    OFFICIAL_WORKIO_CATEGORIES,
    normalize_service_category,
    get_city_coords,
    SRI_LANKA_CITY_COORDS,
    haversine_distance
)

logger = logging.getLogger("agent_backend.booking_tools")


def normalize_datetime_str(dt_str: Optional[str], default_hour: int = 10) -> Optional[str]:
    """
    Robustly parses and normalizes date/time strings in any format
    (e.g., '2026/9/30', '30/09/2026', '2026-09-30T10:00:00', 'Sep 30, 2026')
    into standard ISO 8601 string.
    """
    if not dt_str:
        return dt_str
    s = str(dt_str).strip().replace("Z", "")
    try:
        dt = datetime.fromisoformat(s)
        return dt.isoformat()
    except Exception:
        pass

    patterns = [
        "%Y/%m/%d %H:%M:%S", "%Y/%m/%d %I:%M %p", "%Y/%m/%d %H:%M", "%Y/%m/%d",
        "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %I:%M %p", "%Y-%m-%d %H:%M", "%Y-%m-%d",
        "%d/%m/%Y %H:%M:%S", "%d/%m/%Y %I:%M %p", "%d/%m/%Y %H:%M", "%d/%m/%Y",
        "%d-%m-%Y %H:%M:%S", "%d-%m-%Y %I:%M %p", "%d-%m-%Y %H:%M", "%d-%m-%Y",
        "%B %d, %Y %I:%M %p", "%B %d, %Y %H:%M", "%B %d, %Y",
        "%d %B %Y %I:%M %p", "%d %B %Y %H:%M", "%d %B %Y",
        "%b %d, %Y %I:%M %p", "%b %d, %Y", "%d %b %Y"
    ]
    s_clean = re.sub(r"\s+", " ", s)
    for pat in patterns:
        try:
            dt = datetime.strptime(s_clean, pat)
            if "%H" not in pat and "%I" not in pat:
                dt = dt.replace(hour=default_hour, minute=0, second=0)
            return dt.isoformat()
        except ValueError:
            continue
    return s


@tool
async def check_worker_availability(workerId: str, startTime: str, endTime: str) -> Dict[str, Any]:
    """
    Check if a worker is available for a specified date and time window.
    - workerId: Worker ID to check
    - startTime: Requested slot start time (e.g., '2026-09-30T10:00:00')
    - endTime: Requested slot end time (e.g., '2026-09-30T12:00:00')
    """
    clean_start = normalize_datetime_str(startTime, default_hour=10) or startTime
    clean_end = normalize_datetime_str(endTime, default_hour=12) or endTime
    result = await mcp_client.call_tool(
        "check_worker_availability",
        {"workerId": str(workerId).strip(), "startTime": clean_start, "endTime": clean_end}
    )
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
    Create a new service booking appointment request after user has explicitly confirmed details.
    Requires workerId, residentId, startTime, endTime, jobTitle, locationAddress, and contactPhone.
    """
    clean_start = normalize_datetime_str(startTime, default_hour=10) or startTime
    clean_end = normalize_datetime_str(endTime, default_hour=12) or endTime
    result = await mcp_client.call_tool(
        "create_booking",
        {
            "workerId": str(workerId).strip(),
            "residentId": str(residentId).strip(),
            "startTime": clean_start,
            "endTime": clean_end,
            "jobTitle": jobTitle,
            "notes": notes or jobTitle,
            "locationAddress": locationAddress,
            "contactPhone": contactPhone
        }
    )
    return sanitize_payload(result)


@tool
async def get_resident_bookings(
    residentId: str,
    upcomingOnly: bool = False
) -> Dict[str, Any]:
    """
    Retrieve all bookings and scheduled appointments for a resident.
    - residentId: Resident user ID or email
    - upcomingOnly: If True, only returns pending or accepted upcoming bookings
    """
    args = {
        "residentId": str(residentId).strip(),
        "upcomingOnly": bool(upcomingOnly)
    }
    result = await mcp_client.call_tool("get_resident_bookings", args)
    return sanitize_payload(result)


@tool
async def reschedule_booking(
    bookingId: str,
    startTime: str,
    endTime: str,
    reason: Optional[str] = None
) -> Dict[str, Any]:
    """
    Reschedule an existing booking to a new time window.
    - bookingId: Unique identifier of the booking
    - startTime: New start date-time (ISO format or standard date string)
    - endTime: New end date-time
    - reason: Optional reason for the reschedule
    """
    clean_start = normalize_datetime_str(startTime, default_hour=10) or startTime
    clean_end = normalize_datetime_str(endTime, default_hour=12) or endTime
    args = {
        "bookingId": str(bookingId).strip(),
        "startTime": clean_start,
        "endTime": clean_end,
        "reason": reason or "Resident requested reschedule"
    }
    result = await mcp_client.call_tool("reschedule_booking", args)
    return sanitize_payload(result)


@tool
async def cancel_booking(
    bookingId: str,
    reason: Optional[str] = None
) -> Dict[str, Any]:
    """
    Cancel an existing booking appointment.
    - bookingId: Unique identifier of the booking to cancel
    - reason: Explanation for why the booking is being canceled
    """
    args = {
        "bookingId": str(bookingId).strip(),
        "reason": reason or "Resident requested cancellation"
    }
    result = await mcp_client.call_tool("cancel_booking", args)
    return sanitize_payload(result)


@tool
async def get_booking_details(bookingId: str) -> Dict[str, Any]:
    """
    Retrieve specific details of a booking by its ID.
    """
    args = {"bookingId": str(bookingId).strip()}
    result = await mcp_client.call_tool("get_booking", args)
    return sanitize_payload(result)


_cached_mcp_categories: List[str] = []

async def get_live_service_categories() -> List[str]:
    """
    Fetch live official service categories dynamically from the backend database via MCP get_service_categories tool.
    Caches the list in memory for fast performance.
    """
    global _cached_mcp_categories
    if _cached_mcp_categories:
        return _cached_mcp_categories

    try:
        raw = await mcp_client.call_tool("get_service_categories", {"includeDetails": True})
        items = raw if isinstance(raw, list) else (raw.get("categories") or raw.get("items") if isinstance(raw, dict) else [])
        names = []
        if isinstance(items, list):
            for it in items:
                if isinstance(it, dict):
                    n = it.get("name") or it.get("categoryName") or it.get("title") or it.get("id")
                    if n:
                        names.append(str(n))
                elif isinstance(it, str):
                    names.append(it)
        if names:
            _cached_mcp_categories = names
            return _cached_mcp_categories
    except Exception as e:
        logger.warning(f"Could not fetch categories from MCP: {e}")

    return OFFICIAL_WORKIO_CATEGORIES


BOOKING_TOOLS = [
    check_worker_availability,
    create_booking,
    get_resident_bookings,
    reschedule_booking,
    cancel_booking,
    get_booking_details
]
