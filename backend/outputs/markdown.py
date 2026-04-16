"""Markdown summary generation via OpenAI Chat API.

Produces a structured markdown document summarising the ticket, build
results, and review.  Falls back to a locally-generated template when
the OpenAI API is unavailable.
"""
from __future__ import annotations

import logging
from pathlib import Path

from models import ReviewResult, Ticket
from outputs import ensure_ticket_output_dir

logger = logging.getLogger(__name__)

try:
    from openai import AsyncOpenAI

    _client: AsyncOpenAI | None = AsyncOpenAI()
except Exception:  # pragma: no cover
    _client = None


# ------------------------------------------------------------------
# Public API
# ------------------------------------------------------------------

async def generate_markdown_summary(
    ticket: Ticket,
    review_result: ReviewResult,
) -> str:
    """Generate a markdown summary and write it to disk.

    Returns:
        Relative path inside the ticket output dir (e.g. ``markdown/summary.md``).
    """
    ticket_dir = ensure_ticket_output_dir(ticket.id)
    md_dir = ticket_dir / "markdown"
    md_dir.mkdir(parents=True, exist_ok=True)
    md_path = md_dir / "summary.md"

    if _client is not None:
        try:
            content = await _generate_via_openai(ticket, review_result)
            md_path.write_text(content)
            logger.info("Markdown summary generated via OpenAI for %s", ticket.id)
            return str(Path("markdown") / md_path.name)
        except Exception:
            logger.warning("OpenAI markdown generation failed, using fallback", exc_info=True)

    # Fallback: build markdown locally (no LLM)
    content = _build_fallback_markdown(ticket, review_result)
    md_path.write_text(content)
    return str(Path("markdown") / md_path.name)


# ------------------------------------------------------------------
# OpenAI generation
# ------------------------------------------------------------------

async def _generate_via_openai(
    ticket: Ticket,
    review_result: ReviewResult,
) -> str:
    assert _client is not None
    prompt = _build_prompt(ticket, review_result)

    response = await _client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a technical writer. Generate a clean, professional "
                    "markdown summary of a completed development task. Include "
                    "sections for: Overview, What Was Built, Acceptance Criteria "
                    "Results, Technical Details, and any Notes or Risks. "
                    "Use proper markdown formatting with headers, lists, and "
                    "code blocks where appropriate."
                ),
            },
            {"role": "user", "content": prompt},
        ],
    )

    return response.choices[0].message.content or ""


def _build_prompt(ticket: Ticket, review_result: ReviewResult) -> str:
    criteria_section = ""
    for cr in review_result.criteria_results:
        icon = {"pass": "PASS", "fail": "FAIL"}.get(cr.status.value, "UNKNOWN")
        criteria_section += f"- [{icon}] {cr.criterion}: {cr.explanation}\n"

    diff_stats = f"{review_result.files_changed} files changed"
    duration = (
        f"{ticket.build_duration_seconds:.0f} seconds"
        if ticket.build_duration_seconds
        else "unknown"
    )

    return (
        f"Ticket: {ticket.title}\n\n"
        f"Description:\n{ticket.description}\n\n"
        f"Acceptance Criteria Results:\n{criteria_section}\n"
        f"Review Summary:\n{review_result.summary}\n\n"
        f"Risk Level: {review_result.risk_level.value}\n"
        f"Files Changed: {diff_stats}\n"
        f"Build Duration: {duration}\n\n"
        f"Diff:\n{(ticket.agent_diff or 'No diff available')[:3000]}\n"
    )


# ------------------------------------------------------------------
# Fallback (no LLM)
# ------------------------------------------------------------------

def _build_fallback_markdown(ticket: Ticket, review_result: ReviewResult) -> str:
    lines = [
        f"# {ticket.title}",
        "",
        "## Overview",
        "",
        review_result.summary,
        "",
        "## Acceptance Criteria",
        "",
    ]
    for cr in review_result.criteria_results:
        icon = {"pass": "✅", "fail": "❌"}.get(cr.status.value, "❓")
        lines.append(f"- {icon} **{cr.criterion}**: {cr.explanation}")

    lines += [
        "",
        "## Technical Details",
        "",
        f"- **Files changed:** {review_result.files_changed}",
        f"- **Risk level:** {review_result.risk_level.value}",
    ]

    if ticket.build_duration_seconds is not None:
        d = ticket.build_duration_seconds
        lines.append(f"- **Build duration:** {int(d // 60)}m {int(d % 60)}s")

    return "\n".join(lines) + "\n"
