from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from uuid import uuid4

from pydantic import BaseModel, Field


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class TicketStatus(str, Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    DONE = "done"
    FAILED = "failed"


class PlanStepStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "inProgress"
    COMPLETED = "completed"


class PlanStep(BaseModel):
    step: str
    status: PlanStepStatus


class CriterionStatus(str, Enum):
    PASS = "pass"
    FAIL = "fail"
    UNKNOWN = "unknown"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class CriterionResult(BaseModel):
    criterion: str
    status: CriterionStatus
    explanation: str


class ReviewResult(BaseModel):
    criteria_results: list[CriterionResult]
    summary: str
    raw_review_text: str
    files_changed: int
    risk_level: RiskLevel


class OutputPreferences(BaseModel):
    screenshots: bool = False
    pixel_diff: bool = False
    video: bool = False
    markdown: bool = False


class TicketOutputs(BaseModel):
    before_screenshots: dict[str, str] = Field(default_factory=dict)
    after_screenshots: dict[str, str] = Field(default_factory=dict)
    diff_heatmaps: dict[str, str] = Field(default_factory=dict)
    video_path: Optional[str] = None
    markdown_path: Optional[str] = None


class AgentLog(BaseModel):
    timestamp: str = Field(default_factory=utc_now_iso)
    type: str
    message: str


class Ticket(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    title: str
    description: str
    acceptance_criteria: list[str]
    target_repo: str
    output_preferences: OutputPreferences = Field(default_factory=OutputPreferences)
    status: TicketStatus = TicketStatus.TODO
    created_at: str = Field(default_factory=utc_now_iso)
    build_started_at: Optional[str] = None
    build_completed_at: Optional[str] = None
    build_duration_seconds: Optional[float] = None
    rejection_feedback: Optional[str] = None
    agent_plan: Optional[list[PlanStep]] = None
    agent_diff: Optional[str] = None
    agent_logs: list[AgentLog] = Field(default_factory=list)
    review_result: Optional[ReviewResult] = None
    outputs: TicketOutputs = Field(default_factory=TicketOutputs)
    current_phase: Optional[str] = None
    codex_thread_id: Optional[str] = None
    worktree_path: Optional[str] = None


class CreateTicketRequest(BaseModel):
    title: str
    description: str
    acceptance_criteria: list[str]
    target_repo: str
    output_preferences: OutputPreferences = Field(default_factory=OutputPreferences)


class RejectTicketRequest(BaseModel):
    feedback: str
