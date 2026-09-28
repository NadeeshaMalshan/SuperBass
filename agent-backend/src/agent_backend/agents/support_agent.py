from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, AIMessage
from agent_backend.config import settings
from agent_backend.state.state import AgentState
from agent_backend.prompts.support_prompts import SUPPORT_AGENT_PROMPT
from agent_backend.tools.support_review_tools import SUPPORT_TOOLS

def support_agent_node(state: AgentState):
    """Executes the Support Agent logic."""
    if settings.openai_api_key and settings.openai_api_key != "your_openai_api_key_here":
        llm = ChatOpenAI(
            model=settings.openai_model,
            temperature=0,
            api_key=settings.openai_api_key
        )
        agent_llm = llm.bind_tools(SUPPORT_TOOLS)
        messages = [SystemMessage(content=SUPPORT_AGENT_PROMPT)] + state.get("messages", [])
        response = agent_llm.invoke(messages)
        return {"messages": [response]}
    return {"messages": [AIMessage(content="[Offline Mode] Support Agent ready. Please configure OPENAI_API_KEY.")]}