"""
Model Context Protocol (MCP) Client for SuperBass.
Communicates with SuperBass MCP Server using JSON-RPC 2.0 protocol over HTTP.
"""

from typing import Any, Dict, List, Optional
import httpx
import logging
import uuid
from agent_backend.config import settings

logger = logging.getLogger("agent_backend.mcp_client")


class MCPClient:
    """Async client communicating with SuperBass MCP Server via JSON-RPC 2.0."""

    def __init__(self, server_url: Optional[str] = None, timeout: Optional[float] = None):
        self.server_url = server_url or settings.mcp_server_url
        self.timeout = timeout or settings.mcp_timeout

    async def list_tools(self) -> Dict[str, Any]:
        """
        Query available tools from the MCP server using `tools/list` method.
        """
        payload = {
            "jsonrpc": "2.0",
            "id": str(uuid.uuid4()),
            "method": "tools/list",
            "params": {}
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(self.server_url, json=payload)
                if response.status_code == 200:
                    data = response.json()
                    return data.get("result", data)
                logger.error(f"MCP tools/list failed with status {response.status_code}: {response.text}")
                return {"error": f"MCP server returned HTTP {response.status_code}"}
        except httpx.ConnectError:
            logger.error(f"Failed to connect to MCP server at {self.server_url}")
            return {
                "error": f"MCP server unreachable at {self.server_url}. Please ensure the MCP server is running on port 8000."
            }
        except Exception as e:
            logger.error(f"Unexpected error in MCP list_tools: {e}")
            return {"error": str(e)}

    async def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute an MCP tool using `tools/call` method with tool name and arguments.
        """
        request_id = str(uuid.uuid4())
        payload = {
            "jsonrpc": "2.0",
            "id": request_id,
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments
            }
        }
        logger.info(f"Invoking MCP Tool '{tool_name}' via {self.server_url} with args: {arguments}")

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(self.server_url, json=payload)
                if response.status_code == 200:
                    data = response.json()
                    if "error" in data:
                        logger.warning(f"MCP Tool '{tool_name}' returned error: {data['error']}")
                        return {
                            "success": False,
                            "error": data["error"].get("message", "Tool execution error"),
                            "details": data["error"]
                        }
                    return data.get("result", {})
                else:
                    logger.error(f"MCP call_tool '{tool_name}' failed HTTP {response.status_code}: {response.text}")
                    return {
                        "success": False,
                        "error": f"MCP Server HTTP {response.status_code}: {response.text}"
                    }
        except httpx.ConnectError:
            error_msg = f"Cannot connect to MCP Server at {self.server_url}. Ensure MCP server is active on port 8000."
            logger.error(error_msg)
            return {
                "success": False,
                "error": error_msg
            }
        except Exception as e:
            logger.error(f"Unexpected error calling MCP tool '{tool_name}': {e}")
            return {
                "success": False,
                "error": f"Tool execution error: {str(e)}"
            }

    async def health_check(self) -> Dict[str, Any]:
        """Check if MCP server is online and healthy."""
        try:
            health_url = self.server_url.replace("/mcp", "/health")
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(health_url)
                if res.status_code == 200:
                    return {"status": "healthy", "url": self.server_url, "details": res.json()}
        except Exception:
            pass

        # Fallback test with tools/list
        res = await self.list_tools()
        if "error" not in res:
            return {"status": "healthy", "url": self.server_url}
        return {"status": "unhealthy", "url": self.server_url, "error": res.get("error")}


mcp_client = MCPClient()
