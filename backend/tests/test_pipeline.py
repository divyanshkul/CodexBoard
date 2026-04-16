from __future__ import annotations

from pathlib import Path

import pytest

from models import OutputPreferences, Ticket, TicketStatus
from pipeline import build_prompt, build_review_result, run_pipeline
from state import save_ticket
from ws_manager import ConnectionManager


class RecordingManager(ConnectionManager):
    def __init__(self) -> None:
        super().__init__()
        self.messages: list[dict] = []

    async def broadcast(self, message: dict) -> None:
        self.messages.append(message)


def test_build_prompt_includes_title(sample_ticket):
    prompt = build_prompt(sample_ticket)
    assert sample_ticket.title in prompt


def test_build_prompt_includes_criteria(sample_ticket):
    prompt = build_prompt(sample_ticket)
    for criterion in sample_ticket.acceptance_criteria:
        assert criterion in prompt


def test_build_prompt_includes_rejection_feedback(sample_ticket):
    sample_ticket.rejection_feedback = "Button should be red"
    prompt = build_prompt(sample_ticket)
    assert "Button should be red" in prompt
    assert "Previous Attempt Rejected" in prompt


def test_build_review_result_structure(sample_ticket):
    result = build_review_result(sample_ticket, "Looks good overall")
    assert len(result.criteria_results) == len(sample_ticket.acceptance_criteria)
    assert result.raw_review_text == "Looks good overall"
    assert result.risk_level.value in ("low", "medium", "high")


@pytest.mark.asyncio
async def test_run_pipeline_generates_review_and_outputs(tmp_path: Path):
    ticket = Ticket(
        title="Pipeline test",
        description="desc",
        acceptance_criteria=["works"],
        target_repo=str(tmp_path / "repo"),
        output_preferences=OutputPreferences(
            screenshots=True,
            pixel_diff=True,
            video=True,
            markdown=True,
        ),
        status=TicketStatus.IN_PROGRESS,
        build_started_at="2025-01-01T00:00:00Z",
    )
    save_ticket(ticket)
    manager = RecordingManager()

    await run_pipeline(ticket, manager)

    from state import get_ticket

    updated = get_ticket(ticket.id)
    assert updated is not None
    assert updated.status == TicketStatus.REVIEW
    assert updated.review_result is not None
    assert updated.outputs.before_screenshots
    assert updated.outputs.after_screenshots
    assert updated.outputs.diff_heatmaps
    assert updated.outputs.video_path is not None
    assert updated.outputs.markdown_path is not None
    assert any(message["type"] == "review_complete" for message in manager.messages)
