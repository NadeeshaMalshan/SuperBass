from typing import Dict, Any
from langchain_core.messages import SystemMessage, AIMessage
from langchain_openai import ChatOpenAI
from agent_backend.config import settings
from agent_backend.state.state import AgentState
from agent_backend.tools.booking_tools import BOOKING_TOOLS
from agent_backend.prompts.booking_prompts import BOOKING_AGENT_SYSTEM_PROMPT

async def booking_agent_node(state: AgentState) -> Dict[str, Any]:
    messages = list(state.get("messages", []))
    email = state.get("email", "resident@superbass.lk")
    prompt = [SystemMessage(content=BOOKING_AGENT_SYSTEM_PROMPT.format(email=email))] + messages

    if settings.openai_api_key and settings.openai_api_key !="your_openai_api_key_here":
        llm = ChatOpenAI(
            model=settings.openai_model,
            temperature=0.2, # Low temperature for accurate slot filling
            api_key=settings.openai_api_key
        ).bind_tools(BOOKING_TOOLS)

        response = await llm.ainvoke(prompt)
        return {"messages": [response]}
    
    return {"messages": [AIMessage(content="[Offline Mode] Booking Agent ready. Please configure OPENAI_API_KEY.")]}