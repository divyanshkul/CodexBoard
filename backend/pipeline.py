"""Build + Review + Output pipeline orchestrator.

Manages the full lifecycle of a ticket:
    1. Create git worktree
    2. (Optional) Start dev server on original repo → capture *before* screenshots
    3. Run Codex build (real or mock)
    4. Review
    5. (Optional) Start dev server on worktree → capture *after* screenshots,
       record video walkthrough with TTS narration
    6. Generate pixel-diff heatmaps
    7. Generate markdown summary
    8. Broadcast ``output_ready`` WebSocket events for each output type
"""
from __future__ import annotations

import asyncio
import logging
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path

from codex_client import CodexAppServerClient
from demo_config import DEMO_PROJECT
from dev_server import DevServerManager
from git_utils import create_worktree, get_workspaces_root, remove_worktree
from models import (
    AgentLog,
    CriterionResult,
    CriterionStatus,
    PlanStep,
    PlanStepStatus,
    ReviewResult,
    RiskLevel,
    Ticket,
    TicketStatus,
)
from outputs.diffgen import generate_diff_heatmaps
from outputs.markdown import generate_markdown_summary
from outputs.pdf_report import generate_pdf_report
from outputs.remotion_video import render_remotion_video
from outputs.screenshots import capture_after_screenshots, capture_before_screenshots
from outputs.video import generate_video
from review_parser import enrich_review_result
from state import append_log, update_ticket
from ws_manager import ConnectionManager

logger = logging.getLogger(__name__)


# ------------------------------------------------------------------
# Config helpers
# ------------------------------------------------------------------

def mock_codex_enabled() -> bool:
    return os.getenv("MOCK_CODEX", "true").lower() == "true"


def codex_model_name() -> str:
    return os.getenv("CODEX_MODEL", "gpt-5.4")


def codex_approval_policy() -> str:
    return os.getenv("CODEX_APPROVAL_POLICY", "never")


def codex_sandbox_policy() -> str:
    return os.getenv("CODEX_SANDBOX_POLICY", "workspace-write")


# ------------------------------------------------------------------
# Prompt / review helpers
# ------------------------------------------------------------------

def build_prompt(ticket: Ticket) -> str:
    lines = [
        f"Title: {ticket.title}",
        "",
        "Description:",
        ticket.description,
        "",
        "Acceptance Criteria:",
        *[f"- {criterion}" for criterion in ticket.acceptance_criteria],
    ]
    if ticket.rejection_feedback:
        lines.extend(
            [
                "",
                "Previous Attempt Rejected:",
                ticket.rejection_feedback,
            ]
        )
    return "\n".join(lines)


def count_changed_files(diff_text: str | None) -> int:
    if not diff_text:
        return 0
    return sum(1 for line in diff_text.splitlines() if line.startswith("diff --git "))


def build_review_result(ticket: Ticket, raw_review_text: str) -> ReviewResult:
    files_changed = count_changed_files(ticket.agent_diff)
    if files_changed >= 8:
        risk_level = RiskLevel.HIGH
    elif files_changed >= 4:
        risk_level = RiskLevel.MEDIUM
    else:
        risk_level = RiskLevel.LOW

    criteria_results = [
        CriterionResult(
            criterion=criterion,
            status=CriterionStatus.UNKNOWN,
            explanation="Awaiting structured review verification.",
        )
        for criterion in ticket.acceptance_criteria
    ]
    summary = raw_review_text.splitlines()[0] if raw_review_text else "Review completed."
    return ReviewResult(
        criteria_results=criteria_results,
        summary=summary,
        raw_review_text=raw_review_text,
        files_changed=files_changed,
        risk_level=risk_level,
    )


def parse_item_to_log(item: dict, event_method: str) -> AgentLog | None:
    item_type = item.get("type", "info")
    if item_type == "agentMessage":
        message = item.get("text")
        return AgentLog(type="agent_message", message=message) if message else None

    if item_type == "commandExecution":
        command = item.get("command")
        if not command:
            return None
        if event_method == "item/started":
            return AgentLog(type="command", message=f"Running: {command}")
        status = item.get("status")
        exit_code = item.get("exitCode")
        suffix = f" (exit {exit_code})" if exit_code is not None else ""
        return AgentLog(type="command", message=f"{status or 'completed'}: {command}{suffix}")

    if item_type == "fileChange":
        paths = [change.get("path") for change in item.get("changes", []) if change.get("path")]
        if not paths:
            return AgentLog(type="file_change", message="Updated files in the worktree.")
        preview = ", ".join(paths[:3])
        if len(paths) > 3:
            preview = f"{preview}, +{len(paths) - 3} more"
        return AgentLog(type="file_change", message=f"Updated files: {preview}")

    if item_type == "enteredReviewMode":
        return AgentLog(type="info", message=f"Started review: {item.get('review', 'current changes')}")

    if item_type == "exitedReviewMode":
        review_text = item.get("review")
        if not review_text:
            return None
        return AgentLog(type="info", message=f"Review finished: {_first_line(review_text)}")

    message = item.get("text") or item.get("message")
    return AgentLog(type="info", message=message) if message else None


def _first_line(text: str) -> str:
    for line in text.splitlines():
        stripped = line.strip()
        if stripped:
            return stripped
    return text.strip()


# ------------------------------------------------------------------
# Main pipeline
# ------------------------------------------------------------------

async def run_pipeline(ticket: Ticket, manager: ConnectionManager) -> None:
    try:
        worktree_path = await _prepare_worktree(ticket)
        ticket = update_ticket(
            ticket.id,
            worktree_path=worktree_path,
            last_error=None,
            current_phase="building",
        )

        # ---- Before screenshots (start dev server on original repo) ----
        if ticket.output_preferences.screenshots:
            before_url = await _try_start_dev_server(
                ticket.target_repo, DEMO_PROJECT["base_port"]
            )
            before = await capture_before_screenshots(ticket, server_url=before_url)
            await _try_stop_dev_server()
            outputs = ticket.outputs.model_copy(update={"before_screenshots": before})
            ticket = update_ticket(ticket.id, outputs=outputs)
            await manager.send_ticket_event(
                "output_ready",
                ticket.id,
                {"output_type": "before_screenshots", "outputs": before},
            )

        # ---- Build ----
        if mock_codex_enabled():
            ticket = await _run_mock_build(ticket, manager)
            ticket = await _run_mock_review(ticket, manager)
        else:
            ticket = await _run_real_build(ticket, manager)

        # ---- Generate outputs (after screenshots, diff, video, markdown) ----
        await _generate_outputs(ticket, manager)

        final_ticket = update_ticket(ticket.id, current_phase=None)
        await manager.send_ticket_event(
            "ticket_status_changed",
            final_ticket.id,
            {"status": final_ticket.status.value, "ticket": final_ticket.model_dump()},
        )
    except Exception as exc:
        logger.error("Pipeline failed for ticket %s: %s", ticket.id, exc, exc_info=True)
        failed = update_ticket(
            ticket.id,
            status=TicketStatus.FAILED,
            last_error=str(exc),
            current_phase=None,
            build_completed_at=_utc_now_iso(),
        )
        await manager.send_ticket_event(
            "build_failed",
            failed.id,
            {"error": str(exc), "ticket": failed.model_dump()},
        )


# ------------------------------------------------------------------
# Dev-server helpers (module-level singleton for before/after)
# ------------------------------------------------------------------

_active_server: DevServerManager | None = None


async def _try_start_dev_server(cwd: str, port: int) -> str | None:
    """Start a dev server. Returns the URL or None.

    Logs LOUDLY on failure so we know exactly why screenshots are stubs.
    """
    global _active_server
    try:
        _active_server = DevServerManager()
        await _active_server.start(
            cwd=cwd,
            command=DEMO_PROJECT["dev_server_command"],
            port=port,
            timeout=DEMO_PROJECT.get("startup_timeout", 30),
        )
        logger.info(
            "=== DEV SERVER STARTED === url=%s cwd=%s",
            _active_server.url,
            cwd,
        )
        return _active_server.url
    except Exception as exc:
        logger.error(
            "=== DEV SERVER FAILED === port=%d cwd=%s error=%s "
            "Screenshots/video for this ticket will be STUBS.",
            port,
            cwd,
            exc,
            exc_info=True,
        )
        _active_server = None
        return None


async def _try_stop_dev_server() -> None:
    global _active_server
    if _active_server is not None:
        try:
            await _active_server.stop()
            logger.info("=== DEV SERVER STOPPED ===")
        except Exception:
            logger.warning("Error stopping dev server", exc_info=True)
        _active_server = None


# ------------------------------------------------------------------
# Worktree
# ------------------------------------------------------------------

async def _prepare_worktree(ticket: Ticket) -> str:
    intended_path = get_workspaces_root() / ticket.id

    existing_path = ticket.worktree_path or str(intended_path)
    if Path(existing_path).exists():
        try:
            await remove_worktree(ticket.target_repo, existing_path)
        except Exception:
            logger.warning("Falling back to direct worktree cleanup for %s", existing_path, exc_info=True)
            shutil.rmtree(existing_path, ignore_errors=True)

    try:
        return await create_worktree(ticket.target_repo, ticket.id)
    except Exception:
        if not mock_codex_enabled():
            raise
        worktree_path = intended_path
        if worktree_path.exists():
            shutil.rmtree(worktree_path)
        worktree_path.mkdir(parents=True, exist_ok=True)
        return str(worktree_path)


# ------------------------------------------------------------------
# Mock build
# ------------------------------------------------------------------

async def _run_mock_build(ticket: Ticket, manager: ConnectionManager) -> Ticket:
    """Simulate a realistic Codex build with detailed logs and timing."""
    D = 4.0  # delay multiplier -- ~2 min total build time for demo

    async def _log(msg: str, log_type: str = "agent_message") -> None:
        entry = AgentLog(type=log_type, message=msg)
        append_log(ticket.id, entry)
        await manager.send_ticket_event("agent_log", ticket.id, {"log": entry.model_dump()})

    async def _plan(steps: list[PlanStep], explanation: str) -> None:
        nonlocal ticket
        ticket = update_ticket(ticket.id, agent_plan=steps)
        await manager.send_ticket_event(
            "agent_plan_updated", ticket.id,
            {"plan": [s.model_dump() for s in steps], "explanation": explanation},
        )

    async def _diff(diff_text: str) -> None:
        nonlocal ticket
        ticket = update_ticket(ticket.id, agent_diff=diff_text)
        await manager.send_ticket_event("agent_diff_updated", ticket.id, {"diff": diff_text})

    # ---- Phase 1: Analyze ----
    plan = [
        PlanStep(step="Analyze codebase and requirements", status=PlanStepStatus.IN_PROGRESS),
        PlanStep(step="Create component and styling", status=PlanStepStatus.PENDING),
        PlanStep(step="Wire state management and persistence", status=PlanStepStatus.PENDING),
        PlanStep(step="Verify build and lint", status=PlanStepStatus.PENDING),
    ]
    await _plan(plan, "Starting by understanding the existing codebase structure.")
    await asyncio.sleep(D * 0.8)

    await _log(f"Inspecting the project to understand the routing and styling setup.")
    await asyncio.sleep(D * 0.5)

    await _log("Running: /bin/zsh -lc 'pwd && rg --files'", "command")
    await asyncio.sleep(D * 0.3)
    await _log("completed: /bin/zsh -lc 'pwd && rg --files' (exit 0)", "command")

    await asyncio.sleep(D * 0.4)
    await _log("Running: /bin/zsh -lc \"sed -n '1,220p' src/App.tsx\"", "command")
    await asyncio.sleep(D * 0.3)
    await _log("completed: /bin/zsh -lc \"sed -n '1,220p' src/App.tsx\" (exit 0)", "command")

    await asyncio.sleep(D * 0.3)
    await _log("Running: /bin/zsh -lc \"sed -n '1,260p' src/App.css\"", "command")
    await asyncio.sleep(D * 0.2)
    await _log("completed: /bin/zsh -lc \"sed -n '1,260p' src/App.css\" (exit 0)", "command")

    await asyncio.sleep(D * 0.3)
    await _log("Running: /bin/zsh -lc \"sed -n '1,200p' src/index.css\"", "command")
    await asyncio.sleep(D * 0.2)
    await _log("completed: /bin/zsh -lc \"sed -n '1,200p' src/index.css\" (exit 0)", "command")

    await asyncio.sleep(D * 0.3)
    await _log("Running: /bin/zsh -lc \"sed -n '1,200p' src/main.tsx\"", "command")
    await asyncio.sleep(D * 0.2)
    await _log("completed: /bin/zsh -lc \"sed -n '1,200p' src/main.tsx\" (exit 0)", "command")

    await asyncio.sleep(D * 0.3)
    await _log("Running: /bin/zsh -lc 'cat tsconfig.json'", "command")
    await asyncio.sleep(D * 0.15)
    await _log("completed: /bin/zsh -lc 'cat tsconfig.json' (exit 0)", "command")

    await asyncio.sleep(D * 0.4)
    await _log(f"Found a Vite app with the main UI in src/App.tsx. Styling is split between App.css and index.css. The app uses standard React with no routing library. I have enough context to implement the feature.")

    await asyncio.sleep(D * 0.3)
    await _log("Running: /bin/zsh -lc 'cat package.json'", "command")
    await asyncio.sleep(D * 0.15)
    await _log("completed: /bin/zsh -lc 'cat package.json' (exit 0)", "command")

    await asyncio.sleep(D * 0.3)
    await _log("Running: /bin/zsh -lc 'git status --short'", "command")
    await asyncio.sleep(D * 0.15)
    await _log("completed: /bin/zsh -lc 'git status --short' (exit 0)", "command")

    # ---- Phase 2: Create component ----
    plan[0].status = PlanStepStatus.COMPLETED
    plan[1].status = PlanStepStatus.IN_PROGRESS
    await _plan(plan, "Codebase analyzed. Now creating the component and styles.")
    await asyncio.sleep(D * 0.4)

    await _log("I have the structure now. I'm switching the app from media-query-only theming to an explicit data-theme model, adding a visible toggle on the main page, and initializing the theme before render so the saved mode survives refresh.")
    await asyncio.sleep(D * 0.5)

    await _log("I'm creating a new ThemeToggle component and updating the CSS custom properties. Using a data-theme attribute on the root element so the switch is clean and maintainable.")
    await asyncio.sleep(D * 0.5)

    diff = (
        "diff --git a/src/App.tsx b/src/App.tsx\n"
        "--- a/src/App.tsx\n"
        "+++ b/src/App.tsx\n"
        "@@ -1,8 +1,42 @@\n"
        "+import { useState, useEffect } from 'react'\n"
        " import './App.css'\n"
        " \n"
        "+const THEME_KEY = 'app-theme'\n"
        "+\n"
        "+function ThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {\n"
        "+  return (\n"
        "+    <button className=\"theme-toggle\" onClick={onToggle}>\n"
        "+      {dark ? '☀️ Light' : '🌙 Dark'}\n"
        "+    </button>\n"
        "+  )\n"
        "+}\n"
        "+\n"
        " function App() {\n"
        "+  const [dark, setDark] = useState(() => localStorage.getItem(THEME_KEY) === 'dark')\n"
        "+\n"
        "+  useEffect(() => {\n"
        "+    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')\n"
        "+    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light')\n"
        "+  }, [dark])\n"
        "+\n"
        "   return (\n"
        "-    <div className=\"app\">\n"
        "+    <div className=\"app\" data-theme={dark ? 'dark' : 'light'}>\n"
        "+      <ThemeToggle dark={dark} onToggle={() => setDark(!dark)} />\n"
    )
    await _log("Updated files: src/App.tsx, src/App.css, src/index.css", "file_change")
    await _diff(diff)
    await asyncio.sleep(D * 0.6)

    diff += (
        "diff --git a/src/App.css b/src/App.css\n"
        "--- a/src/App.css\n"
        "+++ b/src/App.css\n"
        "@@ -1,4 +1,38 @@\n"
        "+:root {\n"
        "+  --bg: #ffffff;\n"
        "+  --text: #1a1a1a;\n"
        "+  --card-bg: #f9fafb;\n"
        "+}\n"
        "+\n"
        "+[data-theme='dark'] {\n"
        "+  --bg: #0f172a;\n"
        "+  --text: #e2e8f0;\n"
        "+  --card-bg: #1e293b;\n"
        "+}\n"
        "+\n"
        "+.theme-toggle {\n"
        "+  padding: 8px 16px;\n"
        "+  border-radius: 8px;\n"
        "+  border: 1px solid var(--text);\n"
        "+  background: var(--card-bg);\n"
        "+  color: var(--text);\n"
        "+  cursor: pointer;\n"
        "+  font-size: 14px;\n"
        "+}\n"
    )
    await _log("Updated files: src/App.css (+38 lines)", "file_change")
    await _diff(diff)

    await asyncio.sleep(D * 0.4)
    await _log("Running: /bin/zsh -lc \"sed -n '1,240p' src/App.tsx\"", "command")
    await asyncio.sleep(D * 0.2)
    await _log("completed: /bin/zsh -lc \"sed -n '1,240p' src/App.tsx\" (exit 0)", "command")

    await asyncio.sleep(D * 0.3)
    await _log("The component and styles are in place. Verifying the file state before moving to persistence.")

    # ---- Phase 3: Wire persistence ----
    plan[1].status = PlanStepStatus.COMPLETED
    plan[2].status = PlanStepStatus.IN_PROGRESS
    await _plan(plan, "Component created. Wiring up localStorage persistence.")
    await asyncio.sleep(D * 0.4)

    await _log("Adding localStorage read on mount and write on toggle. Using a shared THEME_KEY constant to keep it DRY.")
    await asyncio.sleep(D * 0.4)

    await _log("Running: /bin/zsh -lc 'ls -l src/'", "command")
    await asyncio.sleep(D * 0.15)
    await _log("completed: /bin/zsh -lc 'ls -l src/' (exit 0)", "command")

    await asyncio.sleep(D * 0.3)
    await _log("Updated files: src/App.tsx (added useEffect for localStorage sync)", "file_change")

    await asyncio.sleep(D * 0.4)
    await _log("Running: /bin/zsh -lc 'git diff -- src/App.tsx'", "command")
    await asyncio.sleep(D * 0.2)
    await _log("completed: /bin/zsh -lc 'git diff -- src/App.tsx' (exit 0)", "command")

    await asyncio.sleep(D * 0.3)
    await _log("Running: /bin/zsh -lc 'git status --short'", "command")
    await asyncio.sleep(D * 0.15)
    await _log("completed: /bin/zsh -lc 'git status --short' (exit 0)", "command")

    await asyncio.sleep(D * 0.3)
    await _log("Persistence layer is wired. The theme key is stored in localStorage and the useEffect hook reads it on mount. Moving to verification.")

    # ---- Phase 4: Verify ----
    plan[2].status = PlanStepStatus.COMPLETED
    plan[3].status = PlanStepStatus.IN_PROGRESS
    await _plan(plan, "Persistence wired. Running build and lint verification.")
    await asyncio.sleep(D * 0.4)

    await _log("Running: /bin/zsh -lc 'npm run build'", "command")
    await asyncio.sleep(D * 0.6)
    await _log("completed: /bin/zsh -lc 'npm run build' (exit 0)", "command")

    await asyncio.sleep(D * 0.3)
    await _log("Running: /bin/zsh -lc 'npm run lint'", "command")
    await asyncio.sleep(D * 0.4)
    await _log("completed: /bin/zsh -lc 'npm run lint' (exit 0)", "command")

    await asyncio.sleep(D * 0.3)
    await _log("Running: /bin/zsh -lc \"nl -ba src/App.tsx | sed -n '1,260p'\"", "command")
    await asyncio.sleep(D * 0.2)
    await _log("completed: /bin/zsh -lc \"nl -ba src/App.tsx | sed -n '1,260p'\" (exit 0)", "command")

    await asyncio.sleep(D * 0.3)
    await _log("Running: /bin/zsh -lc \"nl -ba src/App.css | sed -n '1,260p'\"", "command")
    await asyncio.sleep(D * 0.2)
    await _log("completed: /bin/zsh -lc \"nl -ba src/App.css | sed -n '1,260p'\" (exit 0)", "command")

    await asyncio.sleep(D * 0.4)
    await _log(f"Build and lint both pass. The dark mode toggle is implemented with CSS custom properties, a data-theme attribute on the root element, and localStorage persistence. All acceptance criteria should be met.")

    # ---- Complete ----
    plan[3].status = PlanStepStatus.COMPLETED
    now = _utc_now_iso()
    duration = _duration_seconds(ticket.build_started_at, now)
    ticket = update_ticket(
        ticket.id,
        agent_plan=plan,
        status=TicketStatus.REVIEW,
        build_completed_at=now,
        build_duration_seconds=duration,
        current_phase="reviewing",
    )
    await _plan(plan, "All steps complete. Handing off to review.")
    await manager.send_ticket_event(
        "ticket_status_changed", ticket.id,
        {"status": ticket.status.value, "ticket": ticket.model_dump()},
    )
    return ticket


async def _run_mock_review(ticket: Ticket, manager: ConnectionManager) -> Ticket:
    await manager.send_ticket_event("review_started", ticket.id, {})

    # Simulate review with logs
    review_log = AgentLog(type="info", message="Started review: current changes")
    append_log(ticket.id, review_log)
    await manager.send_ticket_event("agent_log", ticket.id, {"log": review_log.model_dump()})
    await asyncio.sleep(0.8)

    cmd_log = AgentLog(type="command", message="Running: /bin/zsh -lc \"git status --short && git diff --stat\"")
    append_log(ticket.id, cmd_log)
    await manager.send_ticket_event("agent_log", ticket.id, {"log": cmd_log.model_dump()})
    await asyncio.sleep(0.5)

    cmd_done = AgentLog(type="command", message="completed: /bin/zsh -lc \"git status --short && git diff --stat\" (exit 0)")
    append_log(ticket.id, cmd_done)
    await manager.send_ticket_event("agent_log", ticket.id, {"log": cmd_done.model_dump()})
    await asyncio.sleep(0.4)

    build_log = AgentLog(type="command", message="Running: /bin/zsh -lc 'npm run build'")
    append_log(ticket.id, build_log)
    await manager.send_ticket_event("agent_log", ticket.id, {"log": build_log.model_dump()})
    await asyncio.sleep(0.6)

    build_done = AgentLog(type="command", message="completed: /bin/zsh -lc 'npm run build' (exit 0)")
    append_log(ticket.id, build_done)
    await manager.send_ticket_event("agent_log", ticket.id, {"log": build_done.model_dump()})
    await asyncio.sleep(0.3)

    review_text = (
        "The implementation adds a clean dark mode toggle using CSS custom properties "
        "and a data-theme attribute. The toggle component is well-structured with proper "
        "state management via useState and localStorage persistence via useEffect. "
        "Build and lint both pass. The CSS variable approach ensures all themed elements "
        "update consistently. No issues found."
    )
    review_result = build_review_result(ticket, review_text)
    review_result = await enrich_review_result(ticket, review_result)
    ticket = update_ticket(
        ticket.id,
        review_result=review_result,
        current_phase="generating_outputs",
    )
    await manager.send_ticket_event(
        "review_complete", ticket.id,
        {"review_result": review_result.model_dump(), "ticket": ticket.model_dump()},
    )
    return ticket


# ------------------------------------------------------------------
# Real build
# ------------------------------------------------------------------

async def _run_real_build(ticket: Ticket, manager: ConnectionManager) -> Ticket:
    codex = CodexAppServerClient()
    await codex.start()
    try:
        cwd = ticket.worktree_path or ticket.target_repo
        thread_id = await codex.thread_start(
            model=codex_model_name(),
            cwd=cwd,
            approval_policy=codex_approval_policy(),
            sandbox=codex_sandbox_policy(),
        )
        ticket = update_ticket(ticket.id, codex_thread_id=thread_id)
        build_turn_id = await codex.turn_start(
            thread_id,
            build_prompt(ticket),
            cwd=cwd,
            approval_policy=codex_approval_policy(),
        )
        review_turn_id: str | None = None
        review_text: str | None = None

        async for notification in codex.read_notifications():
            method = notification.get("method")
            params = notification.get("params", {})
            notification_thread_id = params.get("threadId")
            if notification_thread_id and notification_thread_id != thread_id:
                continue

            if method == "turn/plan/updated" and params.get("turnId") == build_turn_id:
                plan = [PlanStep(**entry) for entry in params.get("plan", [])]
                ticket = update_ticket(ticket.id, agent_plan=plan)
                await manager.send_ticket_event(
                    "agent_plan_updated",
                    ticket.id,
                    {"plan": [step.model_dump() for step in plan], "explanation": params.get("explanation")},
                )
            elif method == "turn/diff/updated" and params.get("turnId") == build_turn_id:
                diff = params.get("diff", "")
                ticket = update_ticket(ticket.id, agent_diff=diff)
                await manager.send_ticket_event("agent_diff_updated", ticket.id, {"diff": diff})
            elif method in {"item/started", "item/completed"}:
                item = params.get("item", {})
                log_entry = parse_item_to_log(item, method)
                if log_entry is not None:
                    ticket = append_log(ticket.id, log_entry)
                    await manager.send_ticket_event("agent_log", ticket.id, {"log": log_entry.model_dump()})

                if method == "item/completed" and item.get("type") == "exitedReviewMode":
                    review_text = item.get("review", "").strip() or None
                    if review_text is None:
                        continue
                    review_result = build_review_result(ticket, review_text)
                    review_result = await enrich_review_result(ticket, review_result)
                    ticket = update_ticket(
                        ticket.id,
                        review_result=review_result,
                        current_phase="generating_outputs",
                    )
                    await manager.send_ticket_event(
                        "review_complete",
                        ticket.id,
                        {"review_result": review_result.model_dump(), "ticket": ticket.model_dump()},
                    )
            elif method == "turn/completed":
                turn = params.get("turn", {})
                turn_id = turn.get("id")
                status = turn.get("status")

                if turn_id == build_turn_id:
                    if status != "completed":
                        error = turn.get("error", {}).get("message") or f"Codex build ended with status {status}."
                        raise RuntimeError(error)

                    now = _utc_now_iso()
                    duration = _duration_seconds(ticket.build_started_at, now)
                    ticket = update_ticket(
                        ticket.id,
                        status=TicketStatus.REVIEW,
                        build_completed_at=now,
                        build_duration_seconds=duration,
                        current_phase="reviewing",
                    )
                    await manager.send_ticket_event(
                        "ticket_status_changed",
                        ticket.id,
                        {"status": ticket.status.value, "ticket": ticket.model_dump()},
                    )
                    await manager.send_ticket_event("review_started", ticket.id, {})
                    review_turn_id = await codex.review_start(
                        thread_id,
                        {"type": "uncommittedChanges"},
                        delivery="inline",
                    )
                    continue

                if review_turn_id is None or turn_id != review_turn_id:
                    continue

                if status != "completed":
                    error = turn.get("error", {}).get("message") or f"Codex review ended with status {status}."
                    raise RuntimeError(error)

                if review_text is None:
                    review_text = "Review completed, but no review summary was returned."
                    review_result = build_review_result(ticket, review_text)
                    review_result = await enrich_review_result(ticket, review_result)
                    ticket = update_ticket(
                        ticket.id,
                        review_result=review_result,
                        current_phase="generating_outputs",
                    )
                    await manager.send_ticket_event(
                        "review_complete",
                        ticket.id,
                        {"review_result": review_result.model_dump(), "ticket": ticket.model_dump()},
                    )

                return ticket
    finally:
        await codex.stop()
    raise RuntimeError("Codex build ended without a review completion event")


# ------------------------------------------------------------------
# Output generation
# ------------------------------------------------------------------

async def _generate_outputs(ticket: Ticket, manager: ConnectionManager) -> None:
    """Generate all requested outputs (after screenshots, diff, video, markdown).

    Starts a dev server on the worktree for after-screenshots and video,
    then shuts it down before generating the remaining outputs (diff,
    markdown) which don't need a running server.
    """
    current_ticket = ticket
    after_server_url: str | None = None

    # Start dev server on worktree for after-capture and video
    needs_server = (
        ticket.output_preferences.screenshots or ticket.output_preferences.video
    )
    if needs_server:
        cwd = ticket.worktree_path or ticket.target_repo
        after_server_url = await _try_start_dev_server(
            cwd, DEMO_PROJECT["worktree_port"]
        )

    try:
        # -- After screenshots --
        if ticket.output_preferences.screenshots:
            after = await capture_after_screenshots(ticket, server_url=after_server_url)
            outputs = current_ticket.outputs.model_copy(update={"after_screenshots": after})
            current_ticket = update_ticket(ticket.id, outputs=outputs)
            await manager.send_ticket_event(
                "output_ready",
                ticket.id,
                {"output_type": "after_screenshots", "outputs": after},
            )

            # -- Pixel-diff heatmaps --
            if ticket.output_preferences.pixel_diff:
                heatmaps = await generate_diff_heatmaps(
                    ticket.id,
                    current_ticket.outputs.before_screenshots,
                    after,
                )
                outputs = current_ticket.outputs.model_copy(update={"diff_heatmaps": heatmaps})
                current_ticket = update_ticket(ticket.id, outputs=outputs)
                await manager.send_ticket_event(
                    "output_ready",
                    ticket.id,
                    {"output_type": "diff_heatmaps", "outputs": heatmaps},
                )

        # -- Video walkthrough (with narration) --
        if ticket.output_preferences.video:
            video_path = await generate_video(
                current_ticket, server_url=after_server_url
            )
            outputs = current_ticket.outputs.model_copy(update={"video_path": video_path})
            current_ticket = update_ticket(ticket.id, outputs=outputs)
            await manager.send_ticket_event(
                "output_ready",
                ticket.id,
                {"output_type": "video", "outputs": {"video_path": video_path}},
            )
    finally:
        # Always stop the server
        await _try_stop_dev_server()

    # -- Markdown summary (no server needed) --
    if ticket.output_preferences.markdown and current_ticket.review_result is not None:
        markdown_path = await generate_markdown_summary(
            current_ticket, current_ticket.review_result
        )
        outputs = current_ticket.outputs.model_copy(update={"markdown_path": markdown_path})
        current_ticket = update_ticket(ticket.id, outputs=outputs)
        await manager.send_ticket_event(
            "output_ready",
            ticket.id,
            {"output_type": "markdown", "outputs": {"markdown_path": markdown_path}},
        )

    # -- PDF slide-deck report (no server needed) --
    if current_ticket.review_result is not None:
        try:
            pdf_path = await generate_pdf_report(
                current_ticket, current_ticket.review_result
            )
            outputs = current_ticket.outputs.model_copy(update={"pdf_path": pdf_path})
            current_ticket = update_ticket(ticket.id, outputs=outputs)
            await manager.send_ticket_event(
                "output_ready",
                ticket.id,
                {"output_type": "pdf", "outputs": {"pdf_path": pdf_path}},
            )
        except Exception:
            logger.warning("PDF report generation failed for %s", ticket.id, exc_info=True)

    # -- Remotion demo video (no server needed, data-driven from ticket) --
    if current_ticket.review_result is not None:
        try:
            remotion_path = await render_remotion_video(current_ticket)
            outputs = current_ticket.outputs.model_copy(
                update={"remotion_video_path": remotion_path}
            )
            current_ticket = update_ticket(ticket.id, outputs=outputs)
            await manager.send_ticket_event(
                "output_ready",
                ticket.id,
                {
                    "output_type": "remotion_video",
                    "outputs": {"remotion_video_path": remotion_path},
                },
            )
        except Exception:
            logger.warning(
                "Remotion video render failed for ticket %s, skipping",
                ticket.id,
                exc_info=True,
            )


# ------------------------------------------------------------------
# Utilities
# ------------------------------------------------------------------

def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _duration_seconds(started_at: str | None, completed_at: str) -> float | None:
    if not started_at:
        return None
    start_dt = datetime.fromisoformat(started_at.replace("Z", "+00:00"))
    end_dt = datetime.fromisoformat(completed_at.replace("Z", "+00:00"))
    return round((end_dt - start_dt).total_seconds(), 3)
