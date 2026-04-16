from __future__ import annotations

from models import CreateTicketRequest, OutputPreferences, PlanStepStatus, TicketStatus


def test_ticket_serialization_matches_contract(sample_ticket):
    data = sample_ticket.model_dump()
    assert "id" in data
    assert "title" in data
    assert "acceptance_criteria" in data
    assert "output_preferences" in data
    assert "agent_plan" in data
    assert "agent_diff" in data
    assert "agent_logs" in data
    assert "review_result" in data
    assert "outputs" in data
    assert "current_phase" in data
    assert isinstance(data["agent_logs"], list)
    assert isinstance(data["outputs"]["before_screenshots"], dict)


def test_ticket_status_values():
    assert {status.value for status in TicketStatus} == {"todo", "in_progress", "review", "done", "failed"}


def test_plan_step_status_values():
    assert {status.value for status in PlanStepStatus} == {"pending", "inProgress", "completed"}


def test_output_preferences_defaults():
    prefs = OutputPreferences()
    assert prefs.screenshots is False
    assert prefs.pixel_diff is False
    assert prefs.video is False
    assert prefs.markdown is False


def test_create_ticket_request_validation():
    req = CreateTicketRequest(
        title="Test",
        description="Desc",
        acceptance_criteria=["Works"],
        target_repo="/tmp/test",
    )
    assert req.output_preferences.screenshots is False
