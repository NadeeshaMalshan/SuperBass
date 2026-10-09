import pytest
from agent_backend.tools.booking_tools import normalize_datetime_str, check_worker_availability


def test_normalize_datetime_str():
    """Verify normalize_datetime_str normalizes standard formats to ISO."""
    # YYYY-MM-DD format
    iso_res = normalize_datetime_str("2026-10-25")
    assert iso_res is not None
    assert "2026-10-25" in iso_res

    # YYYY/MM/DD format
    iso_slash = normalize_datetime_str("2026/10/25")
    assert iso_slash is not None
    assert "2026-10-25" in iso_slash


def test_check_worker_availability_tool():
    """Verify check_worker_availability tool schema and args."""
    assert check_worker_availability.name == "check_worker_availability"
    args = check_worker_availability.args
    assert "workerId" in args
    assert "startTime" in args
    assert "endTime" in args
