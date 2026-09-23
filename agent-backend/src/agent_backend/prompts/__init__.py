"""Prompts package exports."""
from agent_backend.prompts.supervisor_prompts import SUPERVISOR_SYSTEM_PROMPT
from agent_backend.prompts.community_prompts import COMMUNITY_AGENT_SYSTEM_PROMPT

__all__ = [
    "SUPERVISOR_SYSTEM_PROMPT",
    "COMMUNITY_AGENT_SYSTEM_PROMPT"
]
