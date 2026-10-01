"""
Knowledge package for Workio platform policies, guarantees, and FAQs.
"""

import json
from pathlib import Path
from typing import Dict, Any

KNOWLEDGE_DIR = Path(__file__).resolve().parent
POLICIES_FILE = KNOWLEDGE_DIR / "policies.json"


def load_platform_policies() -> Dict[str, Any]:
    """Load raw policies JSON dictionary."""
    if not POLICIES_FILE.exists():
        return {}
    try:
        with open(POLICIES_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def get_formatted_policy_knowledge_base() -> str:
    """
    Formats the platform policies into structured text for injection into agent system prompts.
    """
    data = load_platform_policies()
    if not data or not data.get("policies"):
        return ""

    policies = data["policies"]
    lines = [
        "================================================================================",
        "OFFICIAL WORKIO PLATFORM POLICIES & GUARANTEE KNOWLEDGE BASE",
        "================================================================================"
    ]

    # 1. Cancellation & Rescheduling
    c = policies.get("cancellation_and_rescheduling", {})
    if c:
        lines.append(f"\n1. {c.get('title', 'Cancellation Policy')}:")
        lines.append(f"   - Free Cancellation: {c.get('free_cancellation_window')}")
        lines.append(f"   - Late Cancellation Fee: {c.get('late_cancellation_fee')}")
        lines.append(f"   - Rescheduling: {c.get('rescheduling_rules')}")
        lines.append(f"   - Worker No-Show Guarantee: {c.get('worker_no_show_compensation')}")

    # 2. Workmanship Guarantee
    w = policies.get("workmanship_guarantee", {})
    if w:
        lines.append(f"\n2. {w.get('title', 'Workmanship Guarantee')}:")
        lines.append(f"   - Warranty Duration: {w.get('warranty_period')}")
        lines.append(f"   - Coverage: {w.get('coverage')}")
        lines.append(f"   - Recurrent Issues: {w.get('recurrent_issue_resolution')}")
        lines.append(f"   - Exclusions: {w.get('exclusions')}")

    # 3. Pricing & Payments
    p = policies.get("pricing_and_payments", {})
    if p:
        lines.append(f"\n3. {p.get('title', 'Pricing & Payments')}:")
        lines.append(f"   - Pricing Models: {p.get('pricing_models')}")
        lines.append(f"   - Advance Payments: {p.get('advance_payment_rule')}")
        lines.append(f"   - Payment Timing: {p.get('payment_timing')}")
        lines.append(f"   - Payment Methods: {', '.join(p.get('accepted_payment_methods', []))}")
        lines.append(f"   - Diagnostic Fee: {p.get('diagnostic_inspection_fee')}")

    # 4. Trust & Safety
    t = policies.get("trust_and_safety", {})
    if t:
        lines.append(f"\n4. {t.get('title', 'Trust & Safety Standards')}:")
        for req in t.get("vetting_requirements", []):
            lines.append(f"   - Vetting Requirement: {req}")
        lines.append(f"   - Property Protection: {t.get('property_protection_guarantee')}")
        lines.append(f"   - Protection Eligibility: {t.get('platform_protection_rule')}")

    # 5. Disputes & Escalation
    d = policies.get("disputes_and_escalation", {})
    if d:
        lines.append(f"\n5. {d.get('title', 'Dispute Resolution')}:")
        lines.append(f"   - Filing Procedure: {d.get('dispute_filing')}")
        lines.append(f"   - Response SLA: {d.get('response_sla')}")
        lines.append(f"   - Live Supervisor Escalation: {d.get('human_supervisor_escalation')}")

    # 6. Support Contacts
    s = policies.get("support_contacts", {})
    if s:
        lines.append(f"\n6. Official Support Contacts:")
        lines.append(f"   - Emergency Hotline: {s.get('emergency_hotline')}")
        lines.append(f"   - Operating Hours: {s.get('operating_hours')}")
        lines.append(f"   - Support Email: {s.get('email')}")
        lines.append(f"   - Headquarters: {s.get('headquarters')}")

    lines.append("================================================================================")
    return "\n".join(lines)


__all__ = ["load_platform_policies", "get_formatted_policy_knowledge_base"]
