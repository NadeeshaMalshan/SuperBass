import math
from typing import Dict, Any, Optional
from langchain_core.tools import tool
from agent_backend.tools.mcp_client import mcp_client
from agent_backend.tools.community_tools import sanitize_payload

SRI_LANKA_CITY_COORDS = {
    "colombo": (6.9271, 79.8612),
    "dehiwala": (6.8511, 79.8659),
    "mount lavinia": (6.8378, 79.8667),
    "moratuwa": (6.7730, 79.8816),
    "kotte": (6.8914, 79.9048),
    "kaduwela": (6.9333, 79.9833),
    "gampaha": (7.0840, 79.9925),
    "negombo": (7.2008, 79.8736),
    "kalutara": (6.5854, 79.9607),
    "kandy": (7.2906, 80.6337),
    "matale": (7.4675, 80.6234),
    "nuwara eliya": (6.9497, 80.7891),
    "galle": (6.0535, 80.2210),
    "matara": (5.9549, 80.5550),
    "hambantota": (6.1429, 81.1212),
    "jaffna": (9.6615, 80.0255),
    "kurunegala": (7.4863, 80.3623),
    "puttalam": (8.0362, 79.8283),
    "anuradhapura": (8.3114, 80.4037),
    "polonnaruwa": (7.9403, 81.0188),
    "badulla": (6.9934, 81.0550),
    "ratnapura": (6.6828, 80.4034),
    "trincomalee": (8.5874, 81.2152),
    "batticaloa": (7.7310, 81.6747)
}

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0 # km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 1)

def get_city_coords(location: Optional[str]):
    if not location:
        return None
    loc_lower = str(location).lower().strip()
    for city, coords in SRI_LANKA_CITY_COORDS.items():
        if city in loc_lower:
            return coords
    return None

import re
from datetime import datetime

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
async def check_worker_availability(workerId: str, startTime: str, endTime: str) -> Dict[str,Any]:
    """Check if a worker is available for a specified date and time window."""
    clean_start = normalize_datetime_str(startTime, default_hour=10) or startTime
    clean_end = normalize_datetime_str(endTime, default_hour=12) or endTime
    result = await mcp_client.call_tool(
        "check_worker_availability", {"workerId": workerId, "startTime": clean_start, "endTime": clean_end})
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
    clean_start = normalize_datetime_str(startTime, default_hour=10) or startTime
    clean_end = normalize_datetime_str(endTime, default_hour=12) or endTime
    result = await mcp_client.call_tool(
        "create_booking",
        {
            "workerId": workerId,
            "residentId": residentId,
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
async def search_workers(
    skill: Optional[str] = None,
    query: Optional[str] = None,
    location: Optional[str] = None,
    residentLat: Optional[float] = None,
    residentLng: Optional[float] = None,
    maxDistanceKm: Optional[float] = None
) -> Dict[str, Any]:
    """
    Search for verified home service workers and technicians, ranking closest workers near the resident first.
    - skill: Service skill category (e.g. Plumbing, Electrical, AC Repair, Carpentry, Masonry, Cleaning, Painting)
    - query: Worker name or keyword search
    - location: City, town or district name (e.g. Colombo, Kandy, Galle, Matara)
    - residentLat: Resident's latitude coordinate for proximity ranking and distance calculation
    - residentLng: Resident's longitude coordinate for proximity ranking and distance calculation
    - maxDistanceKm: Maximum distance in kilometers to search within (optional)
    """
    params: Dict[str, Any] = {}
    if skill:
        params["skill"] = skill
    if query:
        params["query"] = query
    if location:
        params["location"] = location
    if residentLat is not None:
        params["residentLat"] = residentLat
    if residentLng is not None:
        params["residentLng"] = residentLng
    if maxDistanceKm is not None:
        params["maxDistanceKm"] = maxDistanceKm

    raw_result = await mcp_client.call_tool("search_workers", params)
    data = sanitize_payload(raw_result)

    # Determine reference resident coordinates for proximity ranking
    r_lat = residentLat
    r_lng = residentLng
    if (r_lat is None or r_lng is None) and location:
        coords = get_city_coords(location)
        if coords:
            r_lat, r_lng = coords
    if r_lat is None or r_lng is None:
        r_lat, r_lng = 6.9271, 79.8612 # Colombo default

    if isinstance(data, list):
        for w in data:
            if not isinstance(w, dict):
                continue
            if w.get("distance") is None:
                w_lat = w.get("locationLat")
                w_lng = w.get("locationLng")
                if w_lat is None or w_lng is None:
                    c = get_city_coords(w.get("primaryServiceArea"))
                    if c:
                        w_lat, w_lng = c
                if w_lat is not None and w_lng is not None:
                    w["distance"] = haversine_distance(r_lat, r_lng, float(w_lat), float(w_lng))

        # Sort closest first (None distances placed at end)
        data.sort(key=lambda x: (x.get("distance") is None, float('inf') if x.get("distance") is None else x.get("distance")))

    return data

BOOKING_TOOLS = [search_workers, check_worker_availability, create_booking]
