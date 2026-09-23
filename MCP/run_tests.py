import httpx
import json
import sys

BASE_URL = "http://localhost:8000/mcp"

def call_mcp(method: str, params: dict = None, req_id: str = "test"):
    payload = {
        "jsonrpc": "2.0",
        "id": req_id,
        "method": method
    }
    if params:
        payload["params"] = params
    
    with httpx.Client(timeout=30.0) as client:
        res = client.post(BASE_URL, json=payload)
        return res.json()

def test_tool(tool_name: str, arguments: dict):
    print(f"\n==========================================")
    print(f"TESTING TOOL: {tool_name}")
    print(f"Arguments: {json.dumps(arguments)}")
    print(f"==========================================")
    result = call_mcp("tools/call", {"name": tool_name, "arguments": arguments}, f"req-{tool_name}")
    print(json.dumps(result, indent=2))
    return result

def main():
    print("=== 0. TESTING MCP DISCOVERY METHODS ===")
    print("\n-- initialize --")
    print(json.dumps(call_mcp("initialize"), indent=2))

    print("\n-- tools/list --")
    tools_res = call_mcp("tools/list")
    tool_names = [t["name"] for t in tools_res.get("result", {}).get("tools", [])]
    print(f"Found {len(tool_names)} tools: {tool_names}")

    print("\n-- resources/list --")
    print(json.dumps(call_mcp("resources/list"), indent=2))

    print("\n=== 1. TESTING WORKER TOOLS ===")
    test_tool("search_workers", {"query": "plumber", "page": 1, "pageSize": 5})
    test_tool("get_worker_details", {"workerId": "13"})
    test_tool("get_worker_performance", {"workerId": "13"})
    test_tool("check_worker_availability", {
        "workerId": "13",
        "startTime": "2026-09-24T09:00:00Z",
        "endTime": "2026-09-24T11:00:00Z"
    })

    print("\n=== 2. TESTING BOOKING TOOLS ===")
    create_res = test_tool("create_booking", {
        "workerId": "13",
        "residentId": "kpjmp28@gmail.com",
        "startTime": "2026-09-25T10:00:00Z",
        "endTime": "2026-09-25T12:00:00Z",
        "notes": "Fix kitchen wiring and socket"
    })

    booking_id = None
    if "result" in create_res and isinstance(create_res["result"], dict):
        booking_id = create_res["result"].get("id")

    if not booking_id:
        # Fallback to booking 1 if creation didn't return an id
        booking_id = 1

    print(f"\nUsing bookingId: {booking_id}")
    test_tool("get_booking", {"bookingId": str(booking_id)})
    test_tool("get_resident_bookings", {"residentId": "kpjmp28@gmail.com", "upcomingOnly": False})
    test_tool("reschedule_booking", {
        "bookingId": str(booking_id),
        "startTime": "2026-09-26T14:00:00Z",
        "endTime": "2026-09-26T16:00:00Z",
        "reason": "Rescheduled for Saturday morning"
    })
    test_tool("create_worker_review", {
        "bookingId": str(booking_id),
        "workerId": "13",
        "residentId": "kpjmp28@gmail.com",
        "rating": 5,
        "comment": "Superb electrical work, very safe and prompt!"
    })
    test_tool("cancel_booking", {
        "bookingId": str(booking_id),
        "reason": "Test workflow completed"
    })

    print("\n=== 3. TESTING COMMUNITY TOOLS ===")
    post_res = test_tool("create_community_post", {
        "authorId": "kpjmp28@gmail.com",
        "title": "Community Electrical Safety Workshop",
        "content": "Hosting a quick safety walkthrough this weekend.",
        "communityId": "Electrical"
    })
    post_id = None
    if "result" in post_res and isinstance(post_res["result"], dict):
        post_id = post_res["result"].get("postId")

    test_tool("get_community_posts", {
        "communityId": "Electrical",
        "limit": 5,
        "offset": 0
    })

    if post_id:
        test_tool("update_community_post", {
            "postId": post_id,
            "authorId": "kpjmp28@gmail.com",
            "title": "Updated Electrical Workshop",
            "content": "Updated details: Starting at 11 AM instead of 10 AM.",
            "communityId": "Electrical"
        })
        test_tool("delete_community_post", {
            "postId": post_id,
            "authorId": "kpjmp28@gmail.com"
        })

if __name__ == "__main__":
    main()
