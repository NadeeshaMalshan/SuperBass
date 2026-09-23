"""
Community Specialist Agent Node for SuperBass Multi-Agent System.
Equipped with MCP community tools and user profile tools.
"""

from typing import Dict, Any
from langchain_core.messages import SystemMessage, AIMessage
from langchain_openai import ChatOpenAI
from agent_backend.config import settings
from agent_backend.state.state import AgentState
from agent_backend.tools.community_tools import COMMUNITY_TOOLS
from agent_backend.prompts.community_prompts import COMMUNITY_AGENT_SYSTEM_PROMPT


async def community_agent_node(state: AgentState) -> Dict[str, Any]:
    """
    Community Agent processes user queries using MCP community and user tools.
    """
    messages = list(state.get("messages", []))
    email = state.get("email", "resident@superbass.lk")
    user_type = state.get("user_type", "Resident")

    system_instruction = COMMUNITY_AGENT_SYSTEM_PROMPT.format(
        email=email,
        user_type=user_type
    )

    prompt_messages = [SystemMessage(content=system_instruction)] + messages

    # If OpenAI API Key is valid, use gpt-4o-mini with tool bindings
    if settings.openai_api_key and settings.openai_api_key != "your_openai_api_key_here":
        try:
            llm = ChatOpenAI(
                model=settings.openai_model,
                temperature=settings.openai_temperature,
                api_key=settings.openai_api_key
            )
            llm_with_tools = llm.bind_tools(COMMUNITY_TOOLS)
            response = await llm_with_tools.ainvoke(prompt_messages)
            return {"messages": [response]}
        except Exception as e:
            error_msg = f"Error in Community Agent: {str(e)}"
            return {"messages": [AIMessage(content=error_msg)]}

    # Offline / Test fallback when API key is not yet set
    last_text = messages[-1].content if messages else ""
    return {
        "messages": [
            AIMessage(
                content=f"[Offline Mode] Received request for community posts: '{last_text}'. "
                        f"Active user: {email} ({user_type}). "
                        f"Please configure OPENAI_API_KEY to enable live MCP tool execution."
            )
        ]
    }
