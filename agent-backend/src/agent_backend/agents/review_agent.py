# src/agent_backend/agents/review_agent.py
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, AIMessage
from agent_backend.config import settings
from agent_backend.state.state import AgentState
from agent_backend.prompts.review_prompts import REVIEW_AGENT_PROMPT
from agent_backend.tools.support_review_tools import REVIEW_TOOLS

def review_agent_node(state: AgentState):
    """Executes the Review Agent logic."""
    if settings.openai_api_key and settings.openai_api_key != "your_openai_api_key_here":
        llm = ChatOpenAI(
            model=settings.openai_model,
            temperature=0,
            api_key=settings.openai_api_key
        )
        agent_llm = llm.bind_tools(REVIEW_TOOLS)
        messages = [SystemMessage(content=REVIEW_AGENT_PROMPT)] + state.get("messages", [])
        response = agent_llm.invoke(messages)
        return {"messages": [response]}
    return {"messages": [AIMessage(content="[Offline Mode] Review Agent ready. Please configure OPENAI_API_KEY.")]}