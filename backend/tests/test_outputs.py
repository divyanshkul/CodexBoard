"""Tests for the output pipeline modules.

These tests exercise the output modules in isolation (no live dev server
or external APIs required).  External dependencies (Playwright, OpenAI,
pixelmatch) are mocked or the fallback codepaths are tested.
"""
from __future__ import annotations

import asyncio
import os
import textwrap
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from models import (
    CriterionResult,
    CriterionStatus,
    OutputPreferences,
    ReviewResult,
    RiskLevel,
    Ticket,
    TicketOutputs,
    TicketStatus,
)
from outputs import extract_routes, get_outputs_root, route_to_filename
from state import save_ticket


# ------------------------------------------------------------------
# Shared helpers / init tests
# ------------------------------------------------------------------


class TestSharedHelpers:
    def test_extract_routes_from_description(self):
        desc = "Modify the /settings page and /about page"
        routes = extract_routes(desc)
        assert "/settings" in routes
        assert "/about" in routes

    def test_extract_routes_fallback(self):
        assert extract_routes("Add a new button") == ["/"]

    def test_extract_routes_nested(self):
        routes = extract_routes("Update /settings/profile")
        assert "/settings/profile" in routes

    def test_route_to_filename_root(self):
        assert route_to_filename("/") == "root.png"

    def test_route_to_filename_basic(self):
        assert route_to_filename("/settings") == "settings.png"

    def test_route_to_filename_nested(self):
        assert route_to_filename("/settings/profile") == "settings-profile.png"


# ------------------------------------------------------------------
# Screenshots
# ------------------------------------------------------------------


class TestScreenshots:
    @pytest.mark.asyncio
    async def test_placeholder_fallback_no_server(self, sample_ticket):
        """Without a server URL, placeholders are written."""
        from outputs.screenshots import capture_before_screenshots

        result = await capture_before_screenshots(sample_ticket, server_url=None, routes=["/"])
        assert "/" in result
        rel_path = result["/"]
        assert rel_path.startswith("before/")
        full = get_outputs_root() / sample_ticket.id / rel_path
        assert full.exists()
        assert full.stat().st_size > 0

    @pytest.mark.asyncio
    async def test_before_and_after_use_different_dirs(self, sample_ticket):
        from outputs.screenshots import capture_after_screenshots, capture_before_screenshots

        before = await capture_before_screenshots(sample_ticket, routes=["/"])
        after = await capture_after_screenshots(sample_ticket, routes=["/"])
        assert before["/"].startswith("before/")
        assert after["/"].startswith("after/")

    @pytest.mark.asyncio
    async def test_multiple_routes(self, sample_ticket):
        from outputs.screenshots import capture_before_screenshots

        routes = ["/", "/settings"]
        result = await capture_before_screenshots(sample_ticket, routes=routes)
        assert len(result) == 2
        assert "/" in result
        assert "/settings" in result

    @pytest.mark.asyncio
    async def test_routes_extracted_from_description(self, sample_ticket):
        """Routes are extracted from the ticket description when not given."""
        from outputs.screenshots import capture_before_screenshots

        # sample_ticket description contains "/settings"
        result = await capture_before_screenshots(sample_ticket)
        assert "/settings" in result


# ------------------------------------------------------------------
# Diffgen
# ------------------------------------------------------------------


class TestDiffgen:
    @pytest.mark.asyncio
    async def test_placeholder_when_no_pixelmatch(self, sample_ticket):
        """If screenshots exist but are tiny placeholders, the diff still works."""
        from outputs.screenshots import capture_after_screenshots, capture_before_screenshots
        from outputs.diffgen import generate_diff_heatmaps

        before = await capture_before_screenshots(sample_ticket, routes=["/"])
        after = await capture_after_screenshots(sample_ticket, routes=["/"])
        heatmaps = await generate_diff_heatmaps(sample_ticket.id, before, after)
        assert "/" in heatmaps
        assert heatmaps["/"].startswith("diff/")

    @pytest.mark.asyncio
    async def test_empty_when_no_shared_routes(self, sample_ticket):
        from outputs.diffgen import generate_diff_heatmaps

        result = await generate_diff_heatmaps(
            sample_ticket.id,
            {"/": "before/root.png"},
            {"/settings": "after/settings.png"},
        )
        assert result == {}


# ------------------------------------------------------------------
# Video
# ------------------------------------------------------------------


class TestVideo:
    @pytest.mark.asyncio
    async def test_stub_when_no_server(self, sample_ticket):
        """Without a server URL, a stub video file is created."""
        from outputs.video import generate_video

        result = await generate_video(sample_ticket, server_url=None)
        assert "video/" in result
        full = get_outputs_root() / sample_ticket.id / result
        assert full.exists()

    def test_narration_script_content(self, sample_ticket):
        from outputs.video import build_narration_script

        script = build_narration_script(sample_ticket)
        assert sample_ticket.title in script
        assert sample_ticket.id[:8] in script

    def test_narration_script_word_count(self, sample_ticket):
        from outputs.video import build_narration_script

        script = build_narration_script(sample_ticket)
        words = len(script.split())
        assert 20 <= words <= 100, f"Narration has {words} words, expected 20-100"


# ------------------------------------------------------------------
# Markdown
# ------------------------------------------------------------------


class TestMarkdown:
    @pytest.mark.asyncio
    async def test_fallback_markdown(self, sample_ticket):
        """When OpenAI is unavailable, a local markdown template is produced."""
        from outputs.markdown import generate_markdown_summary

        review = ReviewResult(
            criteria_results=[
                CriterionResult(
                    criterion="It works",
                    status=CriterionStatus.PASS,
                    explanation="Verified.",
                ),
            ],
            summary="Feature looks good.",
            raw_review_text="Full review.",
            files_changed=3,
            risk_level=RiskLevel.LOW,
        )

        # Patch the client to None to trigger fallback
        with patch("outputs.markdown._client", None):
            path = await generate_markdown_summary(sample_ticket, review)

        assert path.endswith("summary.md")
        full = get_outputs_root() / sample_ticket.id / path
        assert full.exists()
        content = full.read_text()
        assert sample_ticket.title in content
        assert "It works" in content

    @pytest.mark.asyncio
    async def test_openai_markdown(self, sample_ticket):
        """When OpenAI is available, the LLM-generated markdown is used."""
        from outputs.markdown import generate_markdown_summary

        review = ReviewResult(
            criteria_results=[],
            summary="All good.",
            raw_review_text="Review OK.",
            files_changed=1,
            risk_level=RiskLevel.LOW,
        )

        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "# LLM Generated\n\nGreat work."

        mock_client = AsyncMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

        with patch("outputs.markdown._client", mock_client):
            path = await generate_markdown_summary(sample_ticket, review)

        full = get_outputs_root() / sample_ticket.id / path
        content = full.read_text()
        assert "LLM Generated" in content


# ------------------------------------------------------------------
# Dev server
# ------------------------------------------------------------------


class TestDevServer:
    def test_url_property(self):
        from dev_server import DevServerManager

        mgr = DevServerManager()
        with pytest.raises(RuntimeError):
            _ = mgr.url

        mgr.port = 5174
        assert mgr.url == "http://localhost:5174"

    @pytest.mark.asyncio
    async def test_stop_when_not_started(self):
        from dev_server import DevServerManager

        mgr = DevServerManager()
        await mgr.stop()  # should not raise


# ------------------------------------------------------------------
# Pipeline integration (mock build, real output wiring)
# ------------------------------------------------------------------


class TestPipelineOutputWiring:
    """Verify that run_pipeline produces outputs and fires WS events."""

    @pytest.mark.asyncio
    async def test_pipeline_produces_all_outputs(self, tmp_path: Path):
        from pipeline import run_pipeline
        from state import get_ticket
        from ws_manager import ConnectionManager

        class Recorder(ConnectionManager):
            def __init__(self) -> None:
                super().__init__()
                self.messages: list[dict] = []

            async def broadcast(self, message: dict) -> None:
                self.messages.append(message)

        ticket = Ticket(
            title="Pipeline output test",
            description="Add /settings page feature",
            acceptance_criteria=["Works", "Looks good"],
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
        mgr = Recorder()

        await run_pipeline(ticket, mgr)

        updated = get_ticket(ticket.id)
        assert updated is not None
        assert updated.status == TicketStatus.REVIEW
        assert updated.review_result is not None

        # All output types should be populated
        assert updated.outputs.before_screenshots
        assert updated.outputs.after_screenshots
        assert updated.outputs.diff_heatmaps
        assert updated.outputs.video_path is not None
        assert updated.outputs.markdown_path is not None

        # Check WS events
        event_types = [m["type"] for m in mgr.messages]
        assert "review_complete" in event_types
        output_events = [m for m in mgr.messages if m["type"] == "output_ready"]
        output_kinds = {m["data"]["output_type"] for m in output_events}
        assert "before_screenshots" in output_kinds
        assert "after_screenshots" in output_kinds
        assert "diff_heatmaps" in output_kinds
        assert "video" in output_kinds
        assert "markdown" in output_kinds
