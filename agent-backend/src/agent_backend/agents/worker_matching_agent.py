"""
Worker Matching Specialist Agent Node for SuperBass Multi-Agent System.
Understands user worker-search requests, selects worker tools, evaluates candidates,
and returns structured worker recommendations.
"""

from typing import Dict, Any
from langchain_core.messages import SystemMessage, AIMessage
from langchain_openai import ChatOpenAI
from agent_backend.config import settings
from agent_backend.state.state import AgentState
from agent_backend.tools.worker_tools import WORKER_TOOLS
from agent_backend.prompts.worker_matching_prompts import WORKER_MATCHING_AGENT_SYSTEM_PROMPT


async def worker_matching_agent_node(state: AgentState) -> Dict[str, Any]:
    """
    Worker Matching Agent processes worker discovery requests using MCP worker tools.
    """
    messages = list(state.get("messages", []))
    email = state.get("email", "resident@superbass.lk")
    user_type = state.get("user_type", "Resident")

    system_instruction = WORKER_MATCHING_AGENT_SYSTEM_PROMPT.format(
        email=email,
        user_type=user_type
    )

    prompt_messages = [SystemMessage(content=system_instruction)] + messages

    # If OpenAI API Key is configured, execute LLM with tool bindings
    if settings.openai_api_key and settings.openai_api_key != "your_openai_api_key_here":
        try:
            llm = ChatOpenAI(
                model=settings.openai_model,
                temperature=0.2,  # Low temperature for precise requirement extraction and candidate evaluation
                api_key=settings.openai_api_key
            )
            llm_with_tools = llm.bind_tools(WORKER_TOOLS)
            response = await llm_with_tools.ainvoke(prompt_messages)
            return {"messages": [response]}
        except Exception as e:
            error_msg = f"Error in Worker Matching Agent: {str(e)}"
            return {"messages": [AIMessage(content=error_msg)]}

    # Offline / Test fallback when API key is not configured
    last_text = messages[-1].content if messages else ""
    return {
        "messages": [
            AIMessage(
                content=f"[Offline Mode] Received request for worker search: '{last_text}'. "
                        f"Active user: {email} ({user_type}). "
                        f"Please configure OPENAI_API_KEY to enable live MCP worker tool execution."
            )
        ]
    }
