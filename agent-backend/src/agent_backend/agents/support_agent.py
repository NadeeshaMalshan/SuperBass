from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage
from agent_backend.state.state import AgentState
from agent_backend.prompts.support_prompts import SUPPORT_AGENT_PROMPT
from agent_backend.tools.support_review_tools import SUPPORT_TOOLS

# Initialize the core LLM
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

def support_agent_node(state: AgentState):
    """Executes the Support Agent logic."""
    
    # 1. Bind the specific tools to this LLM
    # This tells the LLM: "You are only allowed to use the FAQ and Dispute tools."
    agent_llm = llm.bind_tools(SUPPORT_TOOLS)
    
    # 2. Inject the Persona (System Prompt)
    # We dynamically prepend the system prompt to the conversation history. 
    # This ensures the LLM remembers its rules for this specific turn.
    messages = [SystemMessage(content=SUPPORT_AGENT_PROMPT)] + state["messages"]
    
    # 3. Invoke the LLM
    response = agent_llm.invoke(messages)
    
    # 4. Return the new message to append to the global state
    return {"messages": [response]}