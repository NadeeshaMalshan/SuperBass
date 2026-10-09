from agent_backend.tools.community_tools import sanitize_payload

def test_community_tc_07_sanitize_base64_images():
    """TC-07: Verifies sanitize_payload strips raw base64 data URLs to prevent TPM rate limits."""
    raw_payload = {
        "title": "Kitchen Leak",
        "images": [
            "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...",
            "https://res.cloudinary.com/workio/image/upload/v1234/test.jpg"
        ],
        "userAvatar": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
    }

    sanitized = sanitize_payload(raw_payload)

    assert sanitized["images"][0] == "[image_attached]"
    assert sanitized["images"][1] == "https://res.cloudinary.com/workio/image/upload/v1234/test.jpg"
    assert sanitized["userAvatar"] == "[avatar_attached]"
    assert sanitized["imagesCount"] == 2
