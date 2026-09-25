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
from agent_backend.agents.booking_agent import booking_agent_node
from agent_backend.agents.card_formatter import card_formatter_node
from agent_backend.tools.community_tools import COMMUNITY_TOOLS
from agent_backend.tools.booking_tools import BOOKING_TOOLS


def route_supervisor(state: AgentState) -> Literal["community_agent", "booking_agent", "card_formatter"]:
    """Routes from supervisor to the community agent, booking agent, or to the card formatter."""
    next_node = state.get("next")
    if next_node in ("community_agent", "booking_agent"):
        return next_node
    return "card_formatter"


def build_graph() -> StateGraph:
    """Build and assemble the multi-agent StateGraph."""
    builder = StateGraph(AgentState)

    # 1. Add Nodes
    builder.add_node("supervisor", supervisor_node)
    builder.add_node("community_agent", community_agent_node)
    builder.add_node("community_tools", ToolNode(COMMUNITY_TOOLS))
    builder.add_node("booking_agent", booking_agent_node)
    builder.add_node("booking_tools", ToolNode(BOOKING_TOOLS))
    builder.add_node("card_formatter", card_formatter_node)

    # 2. Add Edges
    builder.add_edge(START, "supervisor")

    builder.add_conditional_edges(
        "supervisor",
        route_supervisor,
        {
            "community_agent": "community_agent",
            "booking_agent": "booking_agent",
            "card_formatter": "card_formatter"
        }
    )

    # Community Agent tool loop
    builder.add_conditional_edges(
        "community_agent",
        tools_condition,
        {
            "tools": "community_tools",
            END: "card_formatter"
        }
    )
    builder.add_edge("community_tools", "community_agent")

    # Booking Agent tool loop
    builder.add_conditional_edges(
        "booking_agent",
        tools_condition,
        {
            "tools": "booking_tools",
            END: "card_formatter"
        }
    )
    builder.add_edge("booking_tools", "booking_agent")

    # Structured UI Card formatting
    builder.add_edge("card_formatter", END)

    return builder


# Compile workflow with in-memory checkpointer for session continuity
checkpointer = MemorySaver()
graph = build_graph().compile(checkpointer=checkpointer)
