import pytest
from agent_backend.schemas.card_models import AgentCardResponse


def test_agent_card_response_text_message():
    """Verify AgentCardResponse envelope for conversational chat replies."""
    envelope = AgentCardResponse(
        response_type="text_message",
        message="I can help you schedule an appointment with a verified plumber. When would you like the service?",
        card_data={"suggested_action": "open_booking_form"},
        metadata={"active_agent": "booking_agent"}
    )
    assert envelope.response_type == "text_message"
    assert "schedule an appointment" in envelope.message
    assert envelope.metadata["active_agent"] == "booking_agent"
