import httpx
import json
import sys

BASE_URL = "http://127.0.0.1:8000/mcp"
TEST_RESULTS = []

def call_mcp(method: str, params: dict = None, req_id: str = "test"):
    payload = {
        "jsonrpc": "2.0",
        "id": req_id,
        "method": method
    }
    if params:
        payload["params"] = params
    
    with httpx.Client(timeout=15.0) as client:
        res = client.post(BASE_URL, json=payload)
        return res.json()

def test_tool(tool_name: str, arguments: dict, check_fn=None):
    print(f"\n==========================================")
    print(f"TESTING TOOL: {tool_name}")
    print(f"Arguments: {json.dumps(arguments)}")
    print(f"==========================================")
    result = call_mcp("tools/call", {"name": tool_name, "arguments": arguments}, f"req-{tool_name}")
    
    success = False
    details = ""
    if "result" in result and result.get("result") is not None:
        if check_fn:
            success, details = check_fn(result["result"])
        else:
            success = True
            details = "Valid result returned"
    elif "error" in result:
        details = f"Error: {result['error'].get('message', 'Unknown error')}"
    else:
        details = "Unexpected response structure"

    print(json.dumps(result, indent=2))
    status_str = "PASS" if success else "FAIL"
    print(f"[{status_str}] {tool_name}: {details}")
    TEST_RESULTS.append({"tool": tool_name, "status": status_str, "details": details})
    return result

def main():
    print("=== 0. TESTING MCP DISCOVERY METHODS ===")
    print("\n-- initialize --")
    init_res = call_mcp("initialize")
    print(json.dumps(init_res, indent=2))
    assert "result" in init_res, "initialize failed"

    print("\n-- tools/list --")
    tools_res = call_mcp("tools/list")
    tools = tools_res.get("result", {}).get("tools", [])
    tool_names = [t["name"] for t in tools]
    print(f"Found {len(tool_names)} registered tools: {tool_names}")
    assert len(tool_names) == 17, f"Expected 17 tools, found {len(tool_names)}"

    print("\n-- resources/list --")
    res_list = call_mcp("resources/list")
    print(json.dumps(res_list, indent=2))
    assert "result" in res_list, "resources/list failed"

    print("\n=== 1. TESTING WORKER TOOLS ===")
    test_tool("search_workers", {"query": "plumber", "page": 1, "pageSize": 5},
              lambda r: (isinstance(r, list) and len(r) > 0, f"Found {len(r)} workers"))
    
    test_tool("get_worker_details", {"workerId": "1"},
              lambda r: (isinstance(r, dict) and r.get("id") == 1, f"Worker: {r.get('name')}"))
    
    test_tool("get_worker_performance", {"workerId": "1"},
              lambda r: (isinstance(r, dict) and "overallRating" in r, f"Rating: {r.get('overallRating')}"))
    
    test_tool("check_worker_availability", {
        "workerId": "1",
        "startTime": "2026-10-05T09:00:00Z",
        "endTime": "2026-10-05T11:00:00Z"
    }, lambda r: (isinstance(r, dict) and "isAvailable" in r, f"Status: {r.get('status')}"))

    print("\n=== 2. TESTING BOOKING TOOLS ===")
    resident_email = "dampahalagevenuri@gmail.com"
    create_res = test_tool("create_booking", {
        "workerId": "1",
        "residentId": resident_email,
        "startTime": "2026-10-06T10:00:00Z",
        "endTime": "2026-10-06T12:00:00Z",
        "notes": "Emergency plumbing repair for leaking pipe"
    }, lambda r: (isinstance(r, dict) and "id" in r, f"Created booking #{r.get('id')}"))

    booking_id = None
    if "result" in create_res and isinstance(create_res["result"], dict):
        booking_id = create_res["result"].get("id")

    if not booking_id:
        booking_id = 1

    print(f"\nUsing bookingId: {booking_id}")
    test_tool("get_booking", {"bookingId": str(booking_id)},
              lambda r: (isinstance(r, dict) and r.get("id") == booking_id, f"Fetched booking #{r.get('id')}"))
    
    test_tool("get_resident_bookings", {"residentId": resident_email, "upcomingOnly": False},
              lambda r: (isinstance(r, list), f"Found {len(r)} bookings for resident"))
    
    test_tool("reschedule_booking", {
        "bookingId": str(booking_id),
        "startTime": "2026-10-07T14:00:00Z",
        "endTime": "2026-10-07T16:00:00Z",
        "reason": "Rescheduled for tomorrow afternoon"
    }, lambda r: (isinstance(r, dict) and "scheduledDate" in r, f"Rescheduled to {r.get('scheduledDate')}"))
    
    test_tool("create_worker_review", {
        "bookingId": str(booking_id),
        "workerId": "1",
        "residentId": resident_email,
        "rating": 5,
        "comment": "Superb plumbing work, very fast and clean!"
    }, lambda r: (isinstance(r, dict), "Review submitted successfully"))
    
    test_tool("cancel_booking", {
        "bookingId": str(booking_id),
        "reason": "Test workflow completed successfully"
    }, lambda r: (isinstance(r, dict) and r.get("status") == "Cancelled", f"Status: {r.get('status')}"))

    print("\n=== 3. TESTING COMMUNITY TOOLS ===")
    post_res = test_tool("create_community_post", {
        "authorId": resident_email,
        "title": "Community Plumbing Maintenance Workshop",
        "content": "Hosting a quick DIY pipe maintenance session this weekend.",
        "communityId": "Plumbing"
    }, lambda r: (isinstance(r, dict) and "postId" in r, f"Created post #{r.get('postId')}"))
    
    post_id = None
    if "result" in post_res and isinstance(post_res["result"], dict):
        post_id = post_res["result"].get("postId")

    test_tool("get_community_posts", {
        "communityId": "Plumbing",
        "limit": 5,
        "offset": 0
    }, lambda r: (isinstance(r, list), f"Found {len(r)} posts in category"))

    if post_id:
        test_tool("update_community_post", {
            "postId": post_id,
            "authorId": resident_email,
            "title": "Updated Plumbing Maintenance Workshop",
            "content": "Updated details: Starting at 11 AM instead of 10 AM.",
            "communityId": "Plumbing"
        }, lambda r: (isinstance(r, dict) and r.get("title") == "Updated Plumbing Maintenance Workshop", "Post updated"))
        
        test_tool("delete_community_post", {
            "postId": post_id,
            "authorId": resident_email
        }, lambda r: (isinstance(r, dict), "Post deleted"))

    test_tool("get_user_community_posts", {
        "email": resident_email
    }, lambda r: (isinstance(r, list), f"Found {len(r)} posts by user"))

    print("\n=== 4. TESTING USER & PROFILE TOOLS ===")
    test_tool("get_user_details", {
        "email": resident_email
    }, lambda r: (isinstance(r, dict) and r.get("email") == resident_email, f"User: {r.get('name')}, Role: {r.get('role')}"))

    print("\n=== 5. TESTING CATEGORIES TOOL ===")
    test_tool("get_service_categories", {},
              lambda r: (isinstance(r, list) and len(r) > 0, f"Found {len(r)} service categories"))

    print("\n==========================================")
    print("           TEST RESULTS SUMMARY           ")
    print("==========================================")
    all_passed = True
    for item in TEST_RESULTS:
        print(f"[{item['status']}] {item['tool']:<30} : {item['details']}")
        if item["status"] != "PASS":
            all_passed = False

    print("==========================================")
    total = len(TEST_RESULTS)
    passed = sum(1 for x in TEST_RESULTS if x["status"] == "PASS")
    print(f"Total Tools Tested: {total} | Passed: {passed} | Failed: {total - passed}")
    if all_passed:
        print("ALL MCP TOOLS RAN SUCCESSFULLY AND GAVE CORRECT OUTPUTS! [SUCCESS]")
    else:
        print("SOME TESTS FAILED! Please inspect logs above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
