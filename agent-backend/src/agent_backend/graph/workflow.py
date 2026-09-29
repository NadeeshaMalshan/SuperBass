"""
LangGraph Multi-Agent Workflow for Workio.
Coordinates Supervisor Agent, Community Agent, Worker Matching Agent, Booking Agent, Support & Review Agent, MCP ToolNodes, and Card Formatter.
"""

from typing import Literal
from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode, tools_condition
from langgraph.checkpoint.memory import MemorySaver

from agent_backend.state.state import AgentState
from agent_backend.agents.supervisor import supervisor_node
from agent_backend.agents.community_agent import community_agent_node
from agent_backend.agents.worker_matching_agent import worker_matching_agent_node
from agent_backend.agents.booking_agent import booking_agent_node
from agent_backend.agents.support_review_agent import support_review_agent_node

from agent_backend.tools.community_tools import COMMUNITY_TOOLS, current_post_images
from agent_backend.tools.worker_matching_tools import WORKER_MATCHING_TOOLS
from agent_backend.tools.booking_tools import BOOKING_TOOLS
from agent_backend.tools.support_review_tools import SUPPORT_REVIEW_TOOLS


def route_supervisor(state: AgentState) -> Literal["community_agent", "worker_matching_agent", "booking_agent", "support_review_agent", "__end__"]:
    """Routes from supervisor to the specialized agents or directly terminates when supervisor answers."""
    next_node = state.get("next")
    if next_node in ("community_agent", "worker_matching_agent", "booking_agent", "support_review_agent"):
        return next_node
    return END


async def community_tools_node(state: AgentState):
    """Execute community tools with automatic injection of user attached images/data from metadata."""
    metadata = state.get("metadata") or {}
    post_images = metadata.get("post_images") or []
    if not post_images and metadata.get("post_data"):
        post_images = metadata.get("post_data", {}).get("images") or []
    if post_images:
        current_post_images.set(post_images)

    messages = list(state.get("messages", []))
    if messages:
        last_msg = messages[-1]
        if hasattr(last_msg, "tool_calls") and last_msg.tool_calls:
            post_data = metadata.get("post_data") or {}
            for tc in last_msg.tool_calls:
                t_name = tc.get("name")
                if t_name == "create_community_post":
                    args = tc.setdefault("args", {})
                    # Never put raw base64 data into tool_calls args
                    if post_images:
                        args["images"] = [f"[attached_image_{i+1}]" for i in range(len(post_images))]
                    if post_data.get("title"):
                        args["title"] = post_data["title"]
                    if post_data.get("content"):
                        args["content"] = post_data["content"]
                    if post_data.get("communityId"):
                        args["communityId"] = post_data["communityId"]
                    if post_data.get("location"):
                        args["location"] = post_data["location"]
                elif t_name == "update_community_post":
                    args = tc.setdefault("args", {})
                    if post_data.get("postId") and not args.get("postId"):
                        args["postId"] = post_data["postId"]
                    if post_data.get("title"):
                        args["title"] = post_data["title"]
                    if post_data.get("content"):
                        args["content"] = post_data["content"]
                    if post_data.get("communityId"):
                        args["communityId"] = post_data["communityId"]
                    if post_data.get("location"):
                        args["location"] = post_data["location"]
    node = ToolNode(COMMUNITY_TOOLS)
    return await node.ainvoke(state)


def build_graph() -> StateGraph:
    """Build and assemble the multi-agent StateGraph (Architecture A)."""
    builder = StateGraph(AgentState)

    # 1. Add Supervisor Node (LLM #1)
    builder.add_node("supervisor", supervisor_node)
    
    # 2. Community Agent & Tools (Agent #1)
    builder.add_node("community_agent", community_agent_node)
    builder.add_node("community_tools", community_tools_node)
    
    # 3. Worker Matching Agent & Tools (Agent #2)
    builder.add_node("worker_matching_agent", worker_matching_agent_node)
    builder.add_node("worker_matching_tools", ToolNode(WORKER_MATCHING_TOOLS))
    
    # 4. Booking Agent & Tools (Agent #3)
    builder.add_node("booking_agent", booking_agent_node)
    builder.add_node("booking_tools", ToolNode(BOOKING_TOOLS))
    
    # 5. Support & Review Agent & Tools (Agent #4)
    builder.add_node("support_review_agent", support_review_agent_node)
    builder.add_node("support_review_tools", ToolNode(SUPPORT_REVIEW_TOOLS))

    # Add Edges
    builder.add_edge(START, "supervisor")

    builder.add_conditional_edges(
        "supervisor",
        route_supervisor,
        {
            "community_agent": "community_agent",
            "worker_matching_agent": "worker_matching_agent",
            "booking_agent": "booking_agent",
            "support_review_agent": "support_review_agent",
            END: END
        }
    )

    # 1. Community Agent tool loop -> directly to END when complete
    builder.add_conditional_edges(
        "community_agent",
        tools_condition,
        {
            "tools": "community_tools",
            END: END
        }
    )
    builder.add_edge("community_tools", "community_agent")

    # 2. Worker Matching Agent tool loop -> directly to END when complete
    builder.add_conditional_edges(
        "worker_matching_agent",
        tools_condition,
        {
            "tools": "worker_matching_tools",
            END: END
        }
    )
    builder.add_edge("worker_matching_tools", "worker_matching_agent")

    # 3. Booking Agent tool loop -> directly to END when complete
    builder.add_conditional_edges(
        "booking_agent",
        tools_condition,
        {
            "tools": "booking_tools",
            END: END
        }
    )
    builder.add_edge("booking_tools", "booking_agent")
    
    # 4. Support & Review Agent tool loop -> directly to END when complete
    builder.add_conditional_edges(
        "support_review_agent",
        tools_condition,
        {
            "tools": "support_review_tools",
            END: END
        }
    )
    builder.add_edge("support_review_tools", "support_review_agent")

    return builder



# Compile workflow with in-memory checkpointer for session continuity
checkpointer = MemorySaver()
graph = build_graph().compile(checkpointer=checkpointer)