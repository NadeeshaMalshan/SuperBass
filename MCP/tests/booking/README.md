# Booking & Chat Component MCP Server Tests (Member 4)

Test files organized by purpose:
- `test_create_booking_tool.py` - create_booking tool definition and schema validation
- `test_get_booking_tool.py` - get_booking tool schema and bookingId requirement
- `test_cancel_booking_tool.py` - cancel_booking tool schema with mandatory reason
- `test_get_resident_bookings_tool.py` - get_resident_bookings tool schema and upcomingOnly
- `test_check_worker_availability_tool.py` - check_worker_availability date/time slot schema
- `test_booking_tool_handlers_mapping.py` - TOOL_FUNCTIONS handler registration
- `test_booking_jsonrpc_dispatch.py` - JSON-RPC 2.0 tools/list and dispatch handling
- `test_chat_participant_lookup_tools.py` - User and worker profile lookup for chat linking
- `test_booking_tool_error_handling.py` - Error response on unknown tool or invalid parameters
- `test_booking_tools_discovery.py` - MCP tools discovery in tools/list response

Run with:
```bash
python -m pytest tests/booking/ -v
```
