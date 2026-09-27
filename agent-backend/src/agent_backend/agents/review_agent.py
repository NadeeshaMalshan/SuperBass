# src/agent_backend/agents/review_agent.py
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage
from agent_backend.state.state import AgentState
from agent_backend.prompts.review_prompts import REVIEW_AGENT_PROMPT
from agent_backend.tools.review_tools import REVIEW_TOOLS

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

def review_agent_node(state: AgentState):
    """Executes the Review Agent logic."""
    
    # 1. Bind the review-specific tools
    agent_llm = llm.bind_tools(REVIEW_TOOLS)
    
    # 2. Inject the Review Persona
    messages = [SystemMessage(content=REVIEW_AGENT_PROMPT)] + state["messages"]
    
    # 3. Invoke the LLM
    response = agent_llm.invoke(messages)
    
    # 4. Update state
    return {"messages": [response]}