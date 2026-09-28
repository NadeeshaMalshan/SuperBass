from fastapi import FastAPI, Request, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any, List, Union
from datetime import datetime
import json
import asyncio
import os
import httpx
import math
import re
import logging
from dotenv import load_dotenv

# Zero-Trust Auth & Eligibility Logic
async def get_authenticated_user(request: Request) -> str:
    """Extracts user_id securely from the session token."""
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Unauthorized")
    # Mocking JWT verification for MVP
    user_id = auth_header.replace("Bearer ", "")
    return user_id

async def verify_job_eligibility(user_id: str, worker_id: str) -> bool:
    """Queries the database to ensure the user had a recent completed job with this worker."""
    # Mocking DB check
    return True

# Load environment variables from .env file
load_dotenv()

app = FastAPI(title="MCP Server", description="Model Context Protocol Server")

@app.post("/mcp/tools/submit_worker_review")
async def mcp_submit_worker_review(
    payload: dict,
    user_id: str = Depends(get_authenticated_user) 
):
    worker_id = payload.get("worker_id")
    rating = payload.get("rating")
    comment = payload.get("comment")

    # 1. Eligibility Check (Zero-Trust boundary)
    is_eligible = await verify_job_eligibility(user_id, worker_id)
    if not is_eligible:
        raise HTTPException(
            status_code=403, 
            detail="User is not eligible to review this worker. No recent completed jobs found."
        )

    # 2. Mocking review submission for MVP
    review_id = f"rev_{worker_id}_{user_id}"
    return {"status": "success", "review_id": review_id}

# MCP Models
class MCPBaseModel(BaseModel):
    jsonrpc: str = "2.0"
    id: Optional[Union[str, int, None]] = None

class MCPRequest(MCPBaseModel):
    method: str
    params: Optional[Dict[str, Any]] = None

class MCPSuccessResponse(MCPBaseModel):
    result: Any

class MCPErrorResponse(MCPBaseModel):
    error: Dict[str, Any]

# Union type for responses
MCPResponse = MCPSuccessResponse | MCPErrorResponse

# MCP Error codes
MCP_ERROR_CODES = {
    -32603: "Internal error",
    -32602: "Invalid params",
    -32601: "Method not found",
    -32600: "Invalid Request"
}

# Backend configuration
BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL", "http://localhost:5000")
backend_client = httpx.AsyncClient(base_url=BACKEND_BASE_URL, timeout=30.0)

# In-memory storage for demo purposes (can be removed if not needed)
resources = {
    "test://resource": {
        "uri": "test://resource",
        "name": "Test Resource",
        "description": "A test resource for demonstration",
        "mimeType": "text/plain",
        "contents": "Hello from MCP resource!"
    }
}

# Tool definitions (mirroring backend APIs)
tools = [
    {
        "name": "search_workers",
        "description": "Search for home service workers and technicians, ranking closest workers near the resident first",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query or worker name"},
                "skill": {"type": "string", "description": "Filter by service skill (e.g. Plumbing, Electrical, AC Repair, Carpentry, Masonry)"},
                "location": {"type": "string", "description": "City or service area name (e.g. Colombo, Kandy, Galle)"},
                "residentLat": {"type": "number", "description": "Resident latitude coordinate for distance proximity search"},
                "residentLng": {"type": "number", "description": "Resident longitude coordinate for distance proximity search"},
                "maxDistanceKm": {"type": "number", "description": "Maximum distance radius in kilometers (optional)"},
                "availability": {"type": "string", "description": "Filter by availability"},
                "page": {"type": "integer", "description": "Page number"},
                "pageSize": {"type": "integer", "description": "Page size"}
            },
            "required": []
        }
    },
    {
        "name": "get_worker_details",
        "description": "Get detailed information about a specific worker",
        "inputSchema": {
            "type": "object",
            "properties": {
                "workerId": {"type": "string", "description": "Worker ID"}
            },
            "required": ["workerId"]
        }
    },
    {
        "name": "get_worker_performance",
        "description": "Get performance metrics for a worker",
        "inputSchema": {
            "type": "object",
            "properties": {
                "workerId": {"type": "string", "description": "Worker ID"}
            },
            "required": ["workerId"]
        }
    },
    {
        "name": "check_worker_availability",
        "description": "Check availability of a worker for a given time slot",
        "inputSchema": {
            "type": "object",
            "properties": {
                "workerId": {"type": "string", "description": "Worker ID"},
                "startTime": {"type": "string", "format": "date-time", "description": "Start time (ISO 8601)"},
                "endTime": {"type": "string", "format": "date-time", "description": "End time (ISO 8601)"}
            },
            "required": ["workerId", "startTime", "endTime"]
        }
    },
    {
        "name": "create_booking",
        "description": "Create a new booking",
        "inputSchema": {
            "type": "object",
            "properties": {
                "workerId": {"type": "string", "description": "Worker ID"},
                "residentId": {"type": "string", "description": "Resident ID"},
                "startTime": {"type": "string", "format": "date-time", "description": "Start time (ISO 8601)"},
                "endTime": {"type": "string", "format": "date-time", "description": "End time (ISO 8601)"},
                "notes": {"type": "string", "description": "Optional notes"}
            },
            "required": ["workerId", "residentId", "startTime", "endTime"]
        }
    },
    {
        "name": "get_booking",
        "description": "Get booking details by ID",
        "inputSchema": {
            "type": "object",
            "properties": {
                "bookingId": {"type": "string", "description": "Booking ID"}
            },
            "required": ["bookingId"]
        }
    },
    {
        "name": "get_resident_bookings",
        "description": "Get all bookings for a resident",
        "inputSchema": {
            "type": "object",
            "properties": {
                "residentId": {"type": "string", "description": "Resident ID"},
                "upcomingOnly": {"type": "boolean", "description": "Only upcoming bookings"}
            },
            "required": ["residentId"]
        }
    },
    {
        "name": "cancel_booking",
        "description": "Cancel a booking",
        "inputSchema": {
            "type": "object",
            "properties": {
                "bookingId": {"type": "string", "description": "Booking ID"},
                "reason": {"type": "string", "description": "Cancellation reason"}
            },
            "required": ["bookingId"]
        }
    },
    {
        "name": "reschedule_booking",
        "description": "Reschedule a booking to a new time slot",
        "inputSchema": {
            "type": "object",
            "properties": {
                "bookingId": {"type": "string", "description": "Booking ID"},
                "startTime": {"type": "string", "format": "date-time", "description": "New start time (ISO 8601)"},
                "endTime": {"type": "string", "format": "date-time", "description": "New end time (ISO 8601)"},
                "reason": {"type": "string", "description": "Reason for rescheduling"}
            },
            "required": ["bookingId", "startTime", "endTime"]
        }
    },
    {
        "name": "create_community_post",
        "description": "Create a new community post under the authenticated user account",
        "inputSchema": {
            "type": "object",
            "properties": {
                "authorId": {"type": "string", "description": "Author user email or ID of the logged in user"},
                "title": {"type": "string", "description": "Post title"},
                "content": {"type": "string", "description": "Post content"},
                "communityId": {"type": "string", "description": "Community ID"},
                "location": {"type": "string", "description": "Service location"},
                "userName": {"type": "string", "description": "Author display name"}
            },
            "required": ["authorId", "title", "content", "communityId"]
        }
    },
    {
        "name": "get_community_posts",
        "description": "Get posts for a community",
        "inputSchema": {
            "type": "object",
            "properties": {
                "communityId": {"type": "string", "description": "Community ID"},
                "limit": {"type": "integer", "description": "Maximum number of posts"},
                "offset": {"type": "integer", "description": "Offset for pagination"}
            },
            "required": ["communityId"]
        }
    },
    {
        "name": "update_community_post",
        "description": "Update an existing community post",
        "inputSchema": {
            "type": "object",
            "properties": {
                "postId": {"type": "integer", "description": "Post ID to update"},
                "title": {"type": "string", "description": "Updated post title"},
                "content": {"type": "string", "description": "Updated post content"},
                "communityId": {"type": "string", "description": "Service category or community ID (optional)"},
                "location": {"type": "string", "description": "Location (optional)"},
                "authorId": {"type": "string", "description": "Author ID or email for authorization (optional)"}
            },
            "required": ["postId", "title", "content"]
        }
    },
    {
        "name": "delete_community_post",
        "description": "Delete a community post",
        "inputSchema": {
            "type": "object",
            "properties": {
                "postId": {"type": "integer", "description": "Post ID to delete"},
                "authorId": {"type": "string", "description": "Author ID or email for authorization (optional)"}
            },
            "required": ["postId"]
        }
    },
    {
        "name": "create_worker_review",
        "description": "Create a review for a worker",
        "inputSchema": {
            "type": "object",
            "properties": {
                "bookingId": {"type": "string", "description": "Booking ID"},
                "workerId": {"type": "string", "description": "Worker ID"},
                "residentId": {"type": "string", "description": "Resident ID (reviewer)"},
                "rating": {"type": "integer", "minimum": 1, "maximum": 5, "description": "Rating (1-5)"},
                "comment": {"type": "string", "description": "Review comment"}
            },
            "required": ["bookingId", "workerId", "residentId", "rating"]
        }
    },
    {
        "name": "get_user_community_posts",
        "description": "Get all community posts published by a specific user using their email",
        "inputSchema": {
            "type": "object",
            "properties": {
                "email": {"type": "string", "description": "User email address"}
            },
            "required": ["email"]
        }
    },
    {
        "name": "get_user_details",
        "description": "Get user profile and account details (role, contact info, worker details if applicable) using their email",
        "inputSchema": {
            "type": "object",
            "properties": {
                "email": {"type": "string", "description": "User email address"}
            },
            "required": ["email"]
        }
    },
    {
        "name": "get_service_categories",
        "description": "Get the official list of 21 standardized service categories available across Workio for workers and community posts",
        "inputSchema": {
            "type": "object",
            "properties": {
                "includeDetails": {"type": "boolean", "description": "Include icons and IDs (default true)"}
            },
            "required": []
        }
    }
]

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
    R = 6371.0 # Radius of earth in km
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

# Tool implementation functions
async def call_search_workers(args: Dict[str, Any]):
    params = {k: v for k, v in args.items() if v is not None}
    
    # If location is provided but not coordinates, resolve coordinates
    res_lat = args.get("residentLat")
    res_lng = args.get("residentLng")
    if (res_lat is None or res_lng is None) and args.get("location"):
        resolved = get_city_coords(str(args.get("location")))
        if resolved:
            res_lat, res_lng = resolved
            params["residentLat"] = res_lat
            params["residentLng"] = res_lng

    if res_lat is None or res_lng is None:
        res_lat, res_lng = 6.9271, 79.8612

    response = await backend_client.get("/api/Workers/search", params=params)
    workers = response.json()
    if not isinstance(workers, list):
        return workers

    # Ensure distance calculation and closest-first sorting
    if res_lat is not None and res_lng is not None:
        try:
            r_lat = float(res_lat)
            r_lng = float(res_lng)
            for w in workers:
                if not isinstance(w, dict):
                    continue
                w_dist = w.get("distance")
                if w_dist is None:
                    w_lat = w.get("locationLat")
                    w_lng = w.get("locationLng")
                    if w_lat is None or w_lng is None:
                        city_c = get_city_coords(w.get("primaryServiceArea"))
                        if city_c:
                            w_lat, w_lng = city_c
                    if w_lat is not None and w_lng is not None:
                        w["distance"] = haversine_distance(r_lat, r_lng, float(w_lat), float(w_lng))
            
            # Sort by distance (None goes to end)
            workers.sort(key=lambda x: (x.get("distance") is None, float('inf') if x.get("distance") is None else x.get("distance")))
        except Exception as e:
            logging.getLogger("uvicorn").warning(f"Distance calculation in MCP failed: {e}")

    return workers

async def call_get_worker_details(args: Dict[str, Any]):
    worker_id = args["workerId"]
    response = await backend_client.get(f"/api/Workers/{worker_id}")
    return response.json()

async def call_get_worker_performance(args: Dict[str, Any]):
    worker_id = args["workerId"]
    response = await backend_client.get(f"/api/Workers/{worker_id}/performance")
    return response.json()

def normalize_datetime_str(dt_str: Optional[str], default_hour: int = 10) -> Optional[str]:
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

async def call_check_worker_availability(args: Dict[str, Any]):
    worker_id = args["workerId"]
    start_time = normalize_datetime_str(args.get("startTime", ""), default_hour=10) or args.get("startTime", "")
    end_time = normalize_datetime_str(args.get("endTime", ""), default_hour=12) or args.get("endTime", "")

    # Fetch worker profile
    response = await backend_client.get(f"/api/Workers/{worker_id}")
    if response.status_code != 200:
        return {"workerId": worker_id, "isAvailable": False, "error": f"Worker not found ({response.status_code})"}

    worker = response.json()
    is_general_available = worker.get("isAvailable", True)
    schedule_json_raw = worker.get("availabilityScheduleJson") or "{}"

    schedule_obj = {}
    if isinstance(schedule_json_raw, str):
        try:
            schedule_obj = json.loads(schedule_json_raw)
        except Exception:
            schedule_obj = {}
    elif isinstance(schedule_json_raw, dict):
        schedule_obj = schedule_json_raw

    is_slot_available = is_general_available
    reason = "Worker is available" if is_general_available else "Worker is currently unavailable"

    if is_general_available and start_time:
        try:
            clean_date = start_time.replace("Z", "+00:00")
            dt = datetime.fromisoformat(clean_date)
            weekday_abbr = dt.strftime("%a")

            work_days = schedule_obj.get("workDays")
            if isinstance(work_days, dict):
                if not work_days.get(weekday_abbr, True):
                    is_slot_available = False
                    reason = f"Worker does not work on {dt.strftime('%A')}s"
            elif isinstance(work_days, list):
                if weekday_abbr not in work_days:
                    is_slot_available = False
                    reason = f"Worker does not work on {dt.strftime('%A')}s"

            start_hour = schedule_obj.get("startTime")
            end_hour = schedule_obj.get("endTime")
            if start_hour and end_hour and is_slot_available:
                req_time = dt.strftime("%H:%M")
                if req_time < start_hour or req_time > end_hour:
                    is_slot_available = False
                    reason = f"Requested time {req_time} is outside worker hours ({start_hour} - {end_hour})"
        except Exception:
            pass

    return {
        "workerId": worker.get("id", worker_id),
        "workerName": worker.get("name"),
        "isAvailable": is_general_available,
        "isSlotAvailable": is_slot_available,
        "status": "Available" if is_slot_available else "Unavailable",
        "reason": reason,
        "schedule": schedule_obj,
        "requestedSlot": {"startTime": start_time, "endTime": end_time}
    }

async def call_create_booking(args: Dict[str, Any]):
    worker_id = int(args.get("workerId", 0))
    resident_email = args.get("residentId") or "resident@workio.lk"
    if "@" not in resident_email:
        resident_email = f"{resident_email}@workio.lk"
    normalized_start = normalize_datetime_str(args.get("startTime"), default_hour=10) or args.get("startTime")
    payload = {
        "workerId": worker_id,
        "residentEmail": resident_email,
        "jobTitle": args.get("jobTitle") or args.get("notes") or "General Maintenance Service",
        "description": args.get("notes") or "Booking created via MCP Tool",
        "scheduledDate": normalized_start,
        "locationAddress": args.get("locationAddress", "Colombo"),
        "contactPhone": args.get("contactPhone", "0771234567")
    }
    response = await backend_client.post("/api/Bookings", json=payload)
    return response.json()

async def call_get_booking(args: Dict[str, Any]):
    booking_id = args["bookingId"]
    response = await backend_client.get(f"/api/Bookings/{booking_id}")
    return response.json()

async def call_get_resident_bookings(args: Dict[str, Any]):
    resident_id = args["residentId"]
    upcoming_only = args.get("upcomingOnly", False)
    params = {"email": resident_id, "upcomingOnly": upcoming_only}
    response = await backend_client.get("/api/Bookings/resident", params=params)
    return response.json()

async def call_cancel_booking(args: Dict[str, Any]):
    booking_id = args["bookingId"]
    reason = args.get("reason", "Cancelled by user")
    response = await backend_client.post(f"/api/Bookings/{booking_id}/cancel", json={"reason": reason})
    return response.json()

async def call_reschedule_booking(args: Dict[str, Any]):
    booking_id = args["bookingId"]
    payload = {
        "scheduledDate": args.get("startTime"),
        "note": args.get("reason", "")
    }
    response = await backend_client.post(f"/api/Bookings/{booking_id}/reschedule", json=payload)
    return response.json()

async def call_create_community_post(args: Dict[str, Any]):
    author_id = args.get("authorId") or args.get("userId") or args.get("userEmail")
    if not author_id or author_id == "demo_user_1":
        author_id = "resident@workio.lk"
    
    user_name = args.get("userName")
    if not user_name:
        user_name = author_id.split("@")[0] if "@" in str(author_id) else "Community Resident"

    user_avatar = args.get("userAvatar")

    payload = {
        "title": args.get("title"),
        "content": args.get("content"),
        "userId": author_id,
        "userEmail": author_id if "@" in str(author_id) else None,
        "userName": user_name,
        "userAvatar": user_avatar,
        "serviceCategoryId": args.get("communityId", "General"),
        "location": args.get("location", "Colombo")
    }
    response = await backend_client.post("/api/community-posts", json=payload)
    if response.status_code >= 400:
        raise ValueError(f"Backend error ({response.status_code}): {response.text}")
    return response.json() if response.text else {"success": True}

async def call_get_community_posts(args: Dict[str, Any]):
    community_id = str(args.get("communityId", "")).strip()
    params = {}
    if args.get("limit") is not None:
        params["limit"] = args["limit"]
    if args.get("offset") is not None:
        params["offset"] = args["offset"]
    if community_id.isdigit():
        response = await backend_client.get(f"/api/community-posts/{community_id}", params=params)
    else:
        if community_id and community_id.lower() != "all":
            params["category"] = community_id
        response = await backend_client.get("/api/community-posts", params=params)
    if response.status_code >= 400:
        raise ValueError(f"Backend error ({response.status_code}): {response.text}")
    return response.json() if response.text else []

async def call_update_community_post(args: Dict[str, Any]):
    post_id = args["postId"]
    payload = {
        "title": args["title"],
        "content": args["content"],
        "serviceCategoryId": args.get("communityId", "General"),
        "location": args.get("location", "Colombo"),
        "userId": args.get("authorId", "demo_user_1"),
        "userEmail": args.get("authorId") if "@" in str(args.get("authorId", "")) else None
    }
    response = await backend_client.put(f"/api/community-posts/{post_id}", json=payload)
    if response.status_code >= 400:
        raise ValueError(f"Backend error ({response.status_code}): {response.text}")
    return response.json() if response.text else {"success": True}

async def call_delete_community_post(args: Dict[str, Any]):
    post_id = args["postId"]
    author_id = args.get("authorId", "")
    params = {}
    if author_id:
        if "@" in str(author_id):
            params["requesterEmail"] = author_id
        params["requesterName"] = str(author_id).split("@")[0]
    response = await backend_client.delete(f"/api/community-posts/{post_id}", params=params)
    if response.status_code >= 400:
        raise ValueError(f"Backend error ({response.status_code}): {response.text}")
    return response.json() if response.text else {"success": True, "deletedPostId": post_id}

async def call_create_worker_review(args: Dict[str, Any]):
    booking_id = args.get("bookingId")
    if not booking_id:
        raise ValueError("bookingId required for creating review")
    rating = int(args.get("rating", 5))
    payload = {
        "qualityRating": rating,
        "punctualityRating": rating,
        "communicationRating": rating,
        "comment": args.get("comment", "")
    }
    response = await backend_client.post(f"/api/Bookings/{booking_id}/review", json=payload)
    if response.status_code >= 400:
        raise ValueError(f"Backend error ({response.status_code}): {response.text}")
    return response.json() if response.text else {"success": True}

async def call_get_user_community_posts(args: Dict[str, Any]):
    email = str(args.get("email", "")).strip()
    if not email:
        raise ValueError("email required")
    response = await backend_client.get(f"/api/community-posts/user/{email}")
    if response.status_code >= 400:
        raise ValueError(f"Backend error ({response.status_code}): {response.text}")
    return response.json() if response.text else []

async def call_get_user_details(args: Dict[str, Any]):
    email = str(args.get("email", "")).strip()
    if not email:
        raise ValueError("email required")
    
    # 1. Fetch resident profile
    resident_data = None
    try:
        r_res = await backend_client.get(f"/api/Residents/{email}")
        if r_res.status_code == 200:
            resident_data = r_res.json()
            if isinstance(resident_data, dict):
                resident_data.pop("passwordHash", None)
    except Exception:
        pass

    # 2. Fetch worker profile if applicable
    worker_profile = None
    is_worker = False
    try:
        w_res = await backend_client.get("/api/workers/me", params={"email": email})
        if w_res.status_code == 200:
            w_data = w_res.json()
            if isinstance(w_data, dict) and w_data.get("worker"):
                is_worker = True
                worker_profile = w_data.get("worker")
                if isinstance(worker_profile, dict):
                    worker_profile.pop("passwordHash", None)
    except Exception:
        pass

    display_name = None
    phone_no = None
    address = None

    if resident_data:
        display_name = resident_data.get("name")
        phone_no = resident_data.get("phoneNo")
        address = resident_data.get("address")

    if not display_name and worker_profile:
        display_name = worker_profile.get("name")
    if not phone_no and worker_profile:
        phone_no = worker_profile.get("phoneNo")

    return {
        "email": email,
        "name": display_name or email.split("@")[0],
        "role": "Worker" if is_worker else "Resident",
        "isWorker": is_worker,
        "phoneNo": phone_no or "",
        "address": address or "",
        "resident": resident_data,
        "worker": worker_profile
    }

async def call_get_service_categories(args: Dict[str, Any]):
    try:
        response = await backend_client.get("/api/categories")
        if response.status_code == 200:
            return response.json()
    except Exception:
        pass
    fallback_res = await backend_client.get("/api/community-posts/categories")
    return fallback_res.json()

# Map tool names to functions
TOOL_FUNCTIONS = {
    "search_workers": call_search_workers,
    "get_worker_details": call_get_worker_details,
    "get_worker_performance": call_get_worker_performance,
    "check_worker_availability": call_check_worker_availability,
    "create_booking": call_create_booking,
    "get_booking": call_get_booking,
    "get_resident_bookings": call_get_resident_bookings,
    "cancel_booking": call_cancel_booking,
    "reschedule_booking": call_reschedule_booking,
    "create_community_post": call_create_community_post,
    "get_community_posts": call_get_community_posts,
    "update_community_post": call_update_community_post,
    "delete_community_post": call_delete_community_post,
    "create_worker_review": call_create_worker_review,
    "get_user_community_posts": call_get_user_community_posts,
    "get_user_details": call_get_user_details,
    "get_service_categories": call_get_service_categories,
}

@app.get("/")
async def root():
    return {"message": "MCP Server is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/mcp")
async def handle_mcp(request: Request):
    """
    Handle MCP JSON-RPC requests over HTTP.
    This implements the basic MCP protocol over HTTP POST.
    """
    try:
        body = await request.json()
        mcp_request = MCPRequest(**body)

        # Handle different MCP methods
        if mcp_request.method == "initialize":
            result = {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "resources": {},
                    "tools": {}
                },
                "serverInfo": {
                    "name": "FastAPI MCP Server",
                    "version": "1.0.0"
                }
            }

        elif mcp_request.method == "resources/list":
            result = {
                "resources": list(resources.values())
            }

        elif mcp_request.method == "resources/read":
            uri = mcp_request.params.get("uri") if mcp_request.params else None
            if uri and uri in resources:
                result = resources[uri]
            else:
                raise ValueError(f"Resource not found: {uri}")

        elif mcp_request.method == "tools/list":
            result = {
                "tools": tools
            }

        elif mcp_request.method == "tools/call":
            tool_name = mcp_request.params.get("name") if mcp_request.params else None
            tool_args = mcp_request.params.get("arguments", {}) if mcp_request.params else {}

            if tool_name in TOOL_FUNCTIONS:
                try:
                    result_data = await TOOL_FUNCTIONS[tool_name](tool_args)
                    result = result_data
                except httpx.HTTPStatusError as e:
                    # Propagate backend error as MCP error
                    raise ValueError(f"Backend error: {e.response.status_code} - {e.response.text}")
                except Exception as e:
                    raise ValueError(f"Tool execution failed: {str(e)}")
            else:
                raise ValueError(f"Unknown tool: {tool_name}")

        else:
            raise ValueError(f"Method not found: {mcp_request.method}")

        # Return success response
        return MCPSuccessResponse(
            result=result,
            id=mcp_request.id
        )

    except ValueError as e:
        # Return error response for known errors
        return MCPErrorResponse(
            error={
                "code": -32602,  # Invalid params
                "message": str(e)
            },
            id=getattr(body, 'id', None) if 'body' in locals() else None
        )
    except Exception as e:
        # Return error response for unexpected errors
        return MCPErrorResponse(
            error={
                "code": -32603,  # Internal error
                "message": f"Internal server error: {str(e)}"
            },
            id=getattr(body, 'id', None) if 'body' in locals() else None
        )

@app.on_event("shutdown")
async def shutdown_event():
    await backend_client.aclose()

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)