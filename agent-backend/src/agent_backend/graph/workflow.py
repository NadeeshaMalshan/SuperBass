"""
LangGraph Multi-Agent Workflow for SuperBass.
Coordinates Supervisor Agent, Community Agent, MCP ToolNode, and Card Formatter.
"""

from typing import Literal
from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode, tools_condition
from langgraph.checkpoint.memory import MemorySaver

from agent_backend.state.state import AgentState
from agent_backend.agents.supervisor import supervisor_node
from agent_backend.agents.community_agent import community_agent_node
from agent_backend.agents.support_agent import support_agent_node
from agent_backend.agents.review_agent import review_agent_node
from agent_backend.agents.card_formatter import card_formatter_node
from agent_backend.tools.community_tools import COMMUNITY_TOOLS
from agent_backend.tools.support_review_tools import SUPPORT_TOOLS, REVIEW_TOOLS


def route_supervisor(state: AgentState) -> Literal["community_agent", "card_formatter", "support_agent", "review_agent"]:
    """Routes from supervisor to the community agent or to the card formatter."""
    next_node = state.get("next")
    if next_node == "community_agent":
        return "community_agent"
    if next_node == "support_agent":
        return "support_agent"
    if next_node == "review_agent":
        return "review_agent"
    return "card_formatter"


def build_graph() -> StateGraph:
    """Build and assemble the multi-agent StateGraph."""
    builder = StateGraph(AgentState)

    # 1. Add Nodes
    all_tools = COMMUNITY_TOOLS + SUPPORT_TOOLS + REVIEW_TOOLS
    builder.add_node("supervisor", supervisor_node)
    builder.add_node("community_agent", community_agent_node)
    builder.add_node("support_agent", support_agent_node)
    builder.add_node("review_agent", review_agent_node)
    builder.add_node("tools", ToolNode(all_tools))
    builder.add_node("card_formatter", card_formatter_node)

    # 2. Add Edges
    builder.add_edge(START, "supervisor")

    builder.add_conditional_edges(
        "supervisor",
        route_supervisor,
        {
            "community_agent": "community_agent",
            "support_agent": "support_agent",
            "review_agent": "review_agent",
            "card_formatter": "card_formatter"
        }
    )

    builder.add_conditional_edges(
        "community_agent",
        tools_condition,
        {
            "tools": "tools",
            END: "card_formatter"
        }
    )

    builder.add_edge("tools", "community_agent")
    builder.add_edge("card_formatter", END)

    return builder


# Compile workflow with in-memory checkpointer for session continuity
checkpointer = MemorySaver()
graph = build_graph().compile(checkpointer=checkpointer)
