from __future__ import annotations

import json
import logging
import os
from typing import Literal, Optional

from models import CriterionResult, CriterionStatus, ReviewResult, Ticket
from pydantic import BaseModel

logger = logging.getLogger(__name__)

try:
    from openai import AsyncOpenAI

    _client: AsyncOpenAI | None = AsyncOpenAI()
except Exception:  # pragma: no cover
    _client = None

DEFAULT_REVIEW_MODEL = os.getenv("OPENAI_REVIEW_MODEL", "gpt-4o-mini")
MAX_DIFF_CHARS = 12000
FALLBACK_FAIL_EXPLANATION = (
    "Structured review did not return a verdict for this criterion, so it is "
    "being treated as failed pending manual review."
)


class StructuredCriterionResult(BaseModel):
    criterion: str
    status: Literal["pass", "fail"]
    explanation: str


class StructuredReviewPayload(BaseModel):
    criteria_results: list[StructuredCriterionResult]
    summary: Optional[str] = None


async def enrich_review_result(ticket: Ticket, review_result: ReviewResult) -> ReviewResult:
    """Replace placeholder review criteria with pass/fail verdicts when possible."""
    if _client is None or not ticket.acceptance_criteria:
        return review_result

    try:
        payload = await _classify_review(ticket, review_result.raw_review_text)
        criteria_results = _normalize_criteria_results(ticket, payload)
        summary = (payload.summary or review_result.summary).strip() or review_result.summary
        return review_result.model_copy(
            update={"criteria_results": criteria_results, "summary": summary}
        )
    except Exception:
        logger.warning(
            "Structured review enrichment failed for %s; keeping fallback review result",
            ticket.id,
            exc_info=True,
        )
        return review_result


async def _classify_review(ticket: Ticket, review_text: str) -> StructuredReviewPayload:
    assert _client is not None
    response = await _client.chat.completions.create(
        model=DEFAULT_REVIEW_MODEL,
        temperature=0,
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a strict software review classifier. Return valid JSON only. "
                    "Evaluate each acceptance criterion using the review text and diff. "
                    "Return exactly one result per criterion, keep the original criterion text, "
                    'and use only "pass" or "fail" statuses. If evidence is weak or missing, '
                    'mark the criterion as "fail" instead of guessing.'
                ),
            },
            {
                "role": "user",
                "content": _build_structured_review_prompt(ticket, review_text),
            },
        ],
    )
    content = response.choices[0].message.content or ""
    data = json.loads(content)
    return StructuredReviewPayload.model_validate(data)


def _build_structured_review_prompt(ticket: Ticket, review_text: str) -> str:
    criteria = "\n".join(
        f"{index}. {criterion}"
        for index, criterion in enumerate(ticket.acceptance_criteria, start=1)
    )
    diff_text = ticket.agent_diff or "No diff available."
    return (
        "Return a JSON object with this shape:\n"
        "{\n"
        '  "summary": "short overall summary",\n'
        '  "criteria_results": [\n'
        '    {"criterion": "original criterion text", "status": "pass|fail", "explanation": "short reason"}\n'
        "  ]\n"
        "}\n\n"
        "Rules:\n"
        "- The output must be valid JSON.\n"
        "- Include every acceptance criterion exactly once and in the same order.\n"
        '- Use only "pass" or "fail". Do not use "unknown".\n'
        "- Base verdicts only on the provided review text and diff.\n"
        "- A criterion passes only when the evidence clearly supports it.\n\n"
        f"Ticket title:\n{ticket.title}\n\n"
        f"Ticket description:\n{ticket.description}\n\n"
        f"Acceptance criteria:\n{criteria}\n\n"
        f"Codex review text:\n{review_text or 'No review text available.'}\n\n"
        f"Unified diff (truncated to {MAX_DIFF_CHARS} chars):\n{diff_text[:MAX_DIFF_CHARS]}\n"
    )


def _normalize_criteria_results(
    ticket: Ticket,
    payload: StructuredReviewPayload,
) -> list[CriterionResult]:
    normalized: dict[str, StructuredCriterionResult] = {
        _normalize_criterion_key(item.criterion): item
        for item in payload.criteria_results
    }
    results: list[CriterionResult] = []
    for criterion in ticket.acceptance_criteria:
        item = normalized.get(_normalize_criterion_key(criterion))
        if item is None:
            results.append(
                CriterionResult(
                    criterion=criterion,
                    status=CriterionStatus.FAIL,
                    explanation=FALLBACK_FAIL_EXPLANATION,
                )
            )
            continue
        explanation = item.explanation.strip() or FALLBACK_FAIL_EXPLANATION
        results.append(
            CriterionResult(
                criterion=criterion,
                status=CriterionStatus(item.status),
                explanation=explanation,
            )
        )
    return results


def _normalize_criterion_key(value: str) -> str:
    return " ".join(value.split()).strip().lower()
