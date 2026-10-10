"""
Security Guardrails and Domain Boundary Verification for Workio Multi-Agent System.
Provides fast pre-LLM injection detection, domain boundary rules, and standardized refusal responses.
"""

import re
from typing import Optional, List, Dict, Any

# Standardized Workio Response for Out-of-Scope Queries
OUT_OF_SCOPE_RESPONSE_TEXT = (
    "I am Workio's AI Assistant, dedicated exclusively to helping you with home repair and "
    "maintenance services, finding verified technicians, booking appointments, and community posts in Sri Lanka. "
    "I cannot answer general knowledge, political, or off-topic questions.\n\n"
    "How can I assist you with your home service needs today?"
)

OUT_OF_SCOPE_CHIPS = [
    "Find a service worker",
    "Create a community post",
    "Browse community feed"
]

# Standardized Workio Response for Prompt Injection / Security Violations
SECURITY_REFUSAL_TEXT = (
    "For security and safety reasons, I can only assist with authentic Workio platform requests "
    "such as finding home service technicians, scheduling bookings, and managing community posts. "
    "How can I help you with your home services today?"
)

# High-confidence prompt injection / jailbreak patterns
PROMPT_INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules|constraints)", re.IGNORECASE),
    re.compile(r"disregard\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\s+(in\s+)?(dan|developer\s+mode|an\s+unrestricted|unfiltered|jailbroken)", re.IGNORECASE),
    re.compile(r"act\s+as\s+(dan|an\s+unfiltered|an\s+unrestricted|a\s+jailbroken|god\s+mode)", re.IGNORECASE),
    re.compile(r"(reveal|print|output|display|show|repeat)\s+(your|the)\s+(system\s+prompt|initial\s+prompt|instructions|hidden\s+prompt)", re.IGNORECASE),
    re.compile(r"what\s+is\s+your\s+(system\s+prompt|instructions|initial\s+prompt)", re.IGNORECASE),
    re.compile(r"system\s+override\s*:\s*", re.IGNORECASE),
    re.compile(r"new\s+rule\s*:\s*you\s+must", re.IGNORECASE),
    re.compile(r"jailbreak\s+(mode|prompt)", re.IGNORECASE),
    re.compile(r"<\s*script[^>]*>", re.IGNORECASE),
]

# Obvious out-of-scope patterns for quick heuristic matching (e.g. offline fallback or fast triage)
OUT_OF_SCOPE_PATTERNS = [
    re.compile(r"\b(president|prime\s+minister|parliament|election|political\s+party|government\s+minister)\b", re.IGNORECASE),
    re.compile(r"\bwho\s+is\s+(the\s+)?(president|prime\s+minister|king|queen|governor|mayor)\b", re.IGNORECASE),
    re.compile(r"\bwhat\s+is\s+the\s+capital\s+of\b", re.IGNORECASE),
    re.compile(r"\b(tell\s+me\s+a\s+joke|write\s+a\s+(poem|essay|story|song))\b", re.IGNORECASE),
    re.compile(r"\b(write|generate|debug)\s+(a\s+)?(python|javascript|code|sql\s+query|script|c\+\+|java)\b", re.IGNORECASE),
    re.compile(r"\b(weather\s+in|weather\s+forecast|temperature\s+in)\b", re.IGNORECASE),
    re.compile(r"\b(cricket\s+score|ipl\s+match|world\s+cup|football\s+score)\b", re.IGNORECASE),
    re.compile(r"\b(stock\s+price|cryptocurrency|bitcoin\s+price)\b", re.IGNORECASE),
    re.compile(r"\b(recipe\s+for|how\s+to\s+cook|bake\s+a\s+cake)\b", re.IGNORECASE),
]


def check_prompt_injection(text: str) -> Optional[str]:
    """
    Evaluates whether the input text contains recognizable prompt injection or jailbreak attempts.
    Returns the matching rule description if detected, or None if clean.
    """
    if not text or not isinstance(text, str):
        return None

    clean = text.strip()
    for pattern in PROMPT_INJECTION_PATTERNS:
        if pattern.search(clean):
            return f"Matched injection pattern: {pattern.pattern}"

    return None


def is_obvious_out_of_scope(text: str) -> bool:
    """
    Quickly checks if a query matches obvious non-Workio topics (politics, trivia, programming, etc.).
    """
    if not text or not isinstance(text, str):
        return False

    clean = text.strip()
    for pattern in OUT_OF_SCOPE_PATTERNS:
        if pattern.search(clean):
            return True

    return False
