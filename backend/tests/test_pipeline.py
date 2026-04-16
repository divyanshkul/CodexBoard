from __future__ import annotations

import asyncio
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from models import CriterionStatus, OutputPreferences, Ticket, TicketStatus
from pipeline import build_prompt, build_review_result, run_pipeline
from review_parser import enrich_review_result
from state import save_ticket
from ws_manager import ConnectionManager


class RecordingManager(ConnectionManager):
    def __init__(self) -> None:
        super().__init__()
        self.messages: list[dict] = []

    async def broadcast(self, message: dict) -> None:
        self.messages.append(message)


async def run(*args: str, cwd: str | None = None) -> None:
    proc = await asyncio.create_subprocess_exec(
        *args,
        cwd=cwd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    assert proc.returncode == 0, stderr.decode() or stdout.decode()


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
async def test_enrich_review_result_uses_openai_json(sample_ticket):
    base_result = build_review_result(sample_ticket, "Looks good overall")

    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = """
    {
      "summary": "Structured review: one criterion failed.",
      "criteria_results": [
        {
          "criterion": "It works",
          "status": "pass",
          "explanation": "The diff and review both indicate the feature works."
        },
        {
          "criterion": "It looks good",
          "status": "fail",
          "explanation": "No styling or UI validation evidence appears in the diff."
        }
      ]
    }
    """

    mock_client = AsyncMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

    with patch("review_parser._client", mock_client):
        enriched = await enrich_review_result(sample_ticket, base_result)

    assert [item.status for item in enriched.criteria_results] == [
        CriterionStatus.PASS,
        CriterionStatus.FAIL,
    ]
    assert enriched.summary == "Structured review: one criterion failed."


@pytest.mark.asyncio
async def test_enrich_review_result_falls_back_on_invalid_json(sample_ticket):
    base_result = build_review_result(sample_ticket, "Looks good overall")

    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = "not-json"

    mock_client = AsyncMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

    with patch("review_parser._client", mock_client):
        enriched = await enrich_review_result(sample_ticket, base_result)

    assert all(item.status == CriterionStatus.UNKNOWN for item in enriched.criteria_results)
    assert enriched.summary == base_result.summary


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

    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = """
    {
      "summary": "Structured review completed.",
      "criteria_results": [
        {
          "criterion": "works",
          "status": "pass",
          "explanation": "The mock diff indicates the feature works."
        }
      ]
    }
    """
    mock_client = AsyncMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

    with patch("review_parser._client", mock_client):
        await run_pipeline(ticket, manager)

    from state import get_ticket

    updated = get_ticket(ticket.id)
    assert updated is not None
    assert updated.status == TicketStatus.REVIEW
    assert updated.review_result is not None
    assert updated.review_result.criteria_results[0].status == CriterionStatus.PASS
    assert updated.outputs.before_screenshots
    assert updated.outputs.after_screenshots
    assert updated.outputs.diff_heatmaps
    assert updated.outputs.video_path is not None
    assert updated.outputs.markdown_path is not None
    assert any(message["type"] == "review_complete" for message in manager.messages)


@pytest.mark.asyncio
async def test_run_pipeline_streams_real_codex_events(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
):
    repo = tmp_path / "repo"
    repo.mkdir()
    await run("git", "init", cwd=str(repo))
    await run("git", "config", "user.email", "test@example.com", cwd=str(repo))
    await run("git", "config", "user.name", "Test User", cwd=str(repo))
    (repo / "README.md").write_text("hello")
    await run("git", "add", "README.md", cwd=str(repo))
    await run("git", "commit", "-m", "init", cwd=str(repo))

    monkeypatch.setenv("MOCK_CODEX", "false")

    class FakeCodexClient:
        async def start(self) -> None:
            return None

        async def stop(self) -> None:
            return None

        async def thread_start(self, model: str, cwd: str, approval_policy: str, sandbox: str) -> str:
            assert cwd
            assert model
            assert approval_policy == "never"
            return "thread-1"

        async def turn_start(self, thread_id: str, prompt: str, cwd: str | None, approval_policy: str | None) -> str:
            assert thread_id == "thread-1"
            assert "Title: Real Codex test" in prompt
            assert cwd is not None
            return "build-turn"

        async def review_start(self, thread_id: str, target: dict, delivery: str = "inline") -> str:
            assert thread_id == "thread-1"
            assert target == {"type": "uncommittedChanges"}
            assert delivery == "inline"
            return "review-turn"

        async def read_notifications(self):
            notifications = [
                {
                    "method": "turn/plan/updated",
                    "params": {
                        "threadId": "thread-1",
                        "turnId": "build-turn",
                        "plan": [
                            {"step": "Inspect repo", "status": "completed"},
                            {"step": "Implement fix", "status": "inProgress"},
                        ],
                        "explanation": "Shipping the change in a small sequence.",
                    },
                },
                {
                    "method": "turn/diff/updated",
                    "params": {
                        "threadId": "thread-1",
                        "turnId": "build-turn",
                        "diff": "diff --git a/README.md b/README.md\n+hello codex\n",
                    },
                },
                {
                    "method": "item/completed",
                    "params": {
                        "threadId": "thread-1",
                        "turnId": "build-turn",
                        "item": {"id": "msg-1", "type": "agentMessage", "text": "Implementing the change now."},
                    },
                },
                {
                    "method": "turn/completed",
                    "params": {
                        "threadId": "thread-1",
                        "turn": {"id": "build-turn", "status": "completed", "items": []},
                    },
                },
                {
                    "method": "item/completed",
                    "params": {
                        "threadId": "thread-1",
                        "turnId": "review-turn",
                        "item": {"id": "review-enter", "type": "enteredReviewMode", "review": "current changes"},
                    },
                },
                {
                    "method": "item/completed",
                    "params": {
                        "threadId": "thread-1",
                        "turnId": "review-turn",
                        "item": {
                            "id": "review-exit",
                            "type": "exitedReviewMode",
                            "review": "No blocking issues found.\nA couple of nits remain.",
                        },
                    },
                },
                {
                    "method": "turn/completed",
                    "params": {
                        "threadId": "thread-1",
                        "turn": {"id": "review-turn", "status": "completed", "items": []},
                    },
                },
            ]
            for notification in notifications:
                yield notification

    monkeypatch.setattr("pipeline.CodexAppServerClient", FakeCodexClient)

    ticket = Ticket(
        title="Real Codex test",
        description="desc",
        acceptance_criteria=["works"],
        target_repo=str(repo),
        output_preferences=OutputPreferences(
            screenshots=False,
            pixel_diff=False,
            video=False,
            markdown=False,
        ),
        status=TicketStatus.IN_PROGRESS,
        build_started_at="2025-01-01T00:00:00Z",
    )
    save_ticket(ticket)
    manager = RecordingManager()

    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = """
    {
      "summary": "Structured review completed.",
      "criteria_results": [
        {
          "criterion": "works",
          "status": "pass",
          "explanation": "The review says there are no blocking issues."
        }
      ]
    }
    """
    mock_client = AsyncMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

    with patch("review_parser._client", mock_client):
        await run_pipeline(ticket, manager)

    from state import get_ticket

    updated = get_ticket(ticket.id)
    assert updated is not None
    assert updated.status == TicketStatus.REVIEW
    assert updated.agent_plan is not None
    assert updated.agent_plan[-1].status.value == "inProgress"
    assert updated.agent_diff is not None
    assert updated.review_result is not None
    assert "No blocking issues found." in updated.review_result.raw_review_text
    assert updated.review_result.criteria_results[0].status == CriterionStatus.PASS
    assert any(message["type"] == "agent_plan_updated" for message in manager.messages)
    assert any(message["type"] == "agent_diff_updated" for message in manager.messages)
    assert any(message["type"] == "review_complete" for message in manager.messages)
