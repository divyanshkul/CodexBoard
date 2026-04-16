from __future__ import annotations

from pathlib import Path

from models import ReviewResult, Ticket
from outputs import ensure_ticket_output_dir


async def generate_markdown_summary(ticket: Ticket, review_result: ReviewResult) -> str:
    ticket_dir = ensure_ticket_output_dir(ticket.id)
    output_dir = ticket_dir / "summary"
    output_dir.mkdir(parents=True, exist_ok=True)
    file_path = output_dir / "review.md"
    content = "\n".join(
        [
            f"# {ticket.title}",
            "",
            review_result.summary,
            "",
            "## Acceptance Criteria",
            *[
                f"- {result.criterion}: {result.status.value}"
                for result in review_result.criteria_results
            ],
        ]
    )
    file_path.write_text(content)
    return str(Path("summary") / file_path.name)
