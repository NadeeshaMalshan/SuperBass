"""
Knowledge package exports for Workio RAG and platform policies.
"""

import json
from pathlib import Path
from typing import Any, Dict, List, Union

from agent_backend.knowledge.policy_retriever import PolicyRetriever, policy_retriever

POLICIES_FILE = Path(__file__).resolve().parent / "policies.json"


def load_platform_policies() -> Union[List[Dict[str, Any]], Dict[str, Any]]:
    """Load raw policies JSON data."""
    if not POLICIES_FILE.exists():
        return []
    try:
        with open(POLICIES_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def get_formatted_policy_knowledge_base() -> str:
    """
    Formats the platform policies into structured text for injection into agent system prompts.
    Supports both list of policy objects and dictionary with 'policies' mapping.
    """
    data = load_platform_policies()
    if not data:
        return ""

    lines = [
        "================================================================================",
        "OFFICIAL WORKIO PLATFORM POLICIES & GUARANTEE KNOWLEDGE BASE",
        "================================================================================",
    ]

    if isinstance(data, list):
        for idx, p in enumerate(data, 1):
            title = p.get("title", f"Policy {idx}")
            category = p.get("category", "")
            summary = p.get("summary", "")
            content = p.get("content", "")
            header = f"\n{idx}. {title}" + (f" [{category}]" if category else "") + ":"
            lines.append(header)
            if summary:
                lines.append(f"   Summary: {summary}")
            if content:
                lines.append(f"   Details: {content}")
    elif isinstance(data, dict):
        policies = data.get("policies", {})
        idx = 1
        for key, p in policies.items():
            if isinstance(p, dict):
                title = p.get("title", key.replace("_", " ").title())
                lines.append(f"\n{idx}. {title}:")
                for k, v in p.items():
                    if k != "title":
                        field_name = k.replace("_", " ").title()
                        if isinstance(v, list):
                            v_str = ", ".join(str(item) for item in v)
                        else:
                            v_str = str(v)
                        lines.append(f"   - {field_name}: {v_str}")
                idx += 1

    lines.append("================================================================================")
    return "\n".join(lines)


__all__ = [
    "policy_retriever",
    "PolicyRetriever",
    "load_platform_policies",
    "get_formatted_policy_knowledge_base",
]
