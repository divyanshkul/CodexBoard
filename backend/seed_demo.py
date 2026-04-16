"""Pre-populate the board with realistic demo data.

When MOCK_CODEX=true and SEED_DEMO=true (or called directly), this fills
the board with tickets in different states so the demo looks alive from
the start. Output files should be pre-placed in outputs/ before starting.

Usage:
  MOCK_CODEX=true SEED_DEMO=true uvicorn main:app --port 8000
"""
from __future__ import annotations

import logging
import os
from pathlib import Path

from models import (
    AgentLog,
    CriterionResult,
    CriterionStatus,
    OutputPreferences,
    PlanStep,
    PlanStepStatus,
    ReviewResult,
    RiskLevel,
    Ticket,
    TicketOutputs,
    TicketStatus,
    utc_now_iso,
)
from state import save_ticket

logger = logging.getLogger(__name__)

DEMO_REPO = "/Users/divyansh/Desktop/Divyansh/Development/Hackathons/CodexHack/CodexBoard/demo-project"


def seed_demo_data() -> None:
    """Seed the in-memory store with demo tickets."""
    if os.getenv("SEED_DEMO", "").lower() not in ("true", "1", "yes"):
        return

    logger.info("=== SEEDING DEMO DATA ===")

    # ---- Ticket 1: DONE (with all outputs) ----
    done_ticket = Ticket(
        id="demo-done-001",
        title="Add user authentication with OAuth",
        description="Implement OAuth 2.0 login with Google and GitHub providers. Users should be able to sign in from the landing page. This affects the / and /login routes.",
        acceptance_criteria=[
            "Login button visible on landing page",
            "Google OAuth flow works end-to-end",
            "GitHub OAuth flow works end-to-end",
            "User session persists on refresh",
        ],
        target_repo=DEMO_REPO,
        output_preferences=OutputPreferences(screenshots=True, pixel_diff=True, video=False, markdown=True),
        status=TicketStatus.DONE,
        created_at="2025-04-16T09:00:00Z",
        build_started_at="2025-04-16T09:01:00Z",
        build_completed_at="2025-04-16T09:07:22Z",
        build_duration_seconds=382,
        agent_plan=[
            PlanStep(step="Analyze authentication requirements", status=PlanStepStatus.COMPLETED),
            PlanStep(step="Install OAuth dependencies", status=PlanStepStatus.COMPLETED),
            PlanStep(step="Create login page with provider buttons", status=PlanStepStatus.COMPLETED),
            PlanStep(step="Implement OAuth callback handlers", status=PlanStepStatus.COMPLETED),
            PlanStep(step="Add session persistence with localStorage", status=PlanStepStatus.COMPLETED),
        ],
        agent_diff="diff --git a/src/Login.tsx b/src/Login.tsx\nnew file mode 100644\n--- /dev/null\n+++ b/src/Login.tsx\n@@ -0,0 +1,45 @@\n+import React from 'react';\n+export function Login() {\n+  return <div>Login page</div>\n+}\n",
        review_result=ReviewResult(
            criteria_results=[
                CriterionResult(criterion="Login button visible on landing page", status=CriterionStatus.PASS, explanation="Login button added to App.tsx header with Google and GitHub icons"),
                CriterionResult(criterion="Google OAuth flow works end-to-end", status=CriterionStatus.PASS, explanation="OAuth redirect and callback handler implemented correctly"),
                CriterionResult(criterion="GitHub OAuth flow works end-to-end", status=CriterionStatus.PASS, explanation="GitHub provider configured with proper scopes"),
                CriterionResult(criterion="User session persists on refresh", status=CriterionStatus.PASS, explanation="Session token stored in localStorage, restored on app mount"),
            ],
            summary="All authentication flows implemented correctly. OAuth tokens are properly managed and sessions persist across refreshes.",
            raw_review_text="The implementation adds a clean OAuth flow with both Google and GitHub providers...",
            files_changed=6,
            risk_level=RiskLevel.LOW,
        ),
        outputs=TicketOutputs(
            before_screenshots={"/": "before/root.png"},
            after_screenshots={"/": "after/root.png"},
            diff_heatmaps={"/": "diff/root-diff.png"},
            video_path=None,
            remotion_video_path="video/demo.mp4",
            markdown_path="markdown/summary.md",
            pdf_path="report/summary.pdf",
        ),
    )
    save_ticket(done_ticket)

    # ---- Ticket 2: IN REVIEW (with outputs generating) ----
    review_ticket = Ticket(
        id="demo-review-002",
        title="Add dark mode toggle to settings",
        description="Add a dark mode toggle switch on the settings page. When toggled, the entire app should switch to a dark color scheme. The toggle state should persist using localStorage. This affects the / and /settings routes.",
        acceptance_criteria=[
            "Dark mode toggle visible on settings page",
            "Toggling switches app to dark colors",
            "Toggle state persists on page refresh",
        ],
        target_repo=DEMO_REPO,
        output_preferences=OutputPreferences(screenshots=True, pixel_diff=True, video=False, markdown=True),
        status=TicketStatus.REVIEW,
        created_at="2025-04-16T09:30:00Z",
        build_started_at="2025-04-16T09:31:00Z",
        build_completed_at="2025-04-16T09:36:12Z",
        build_duration_seconds=312,
        agent_plan=[
            PlanStep(step="Analyze current styling architecture", status=PlanStepStatus.COMPLETED),
            PlanStep(step="Create theme context with localStorage", status=PlanStepStatus.COMPLETED),
            PlanStep(step="Add toggle switch component", status=PlanStepStatus.COMPLETED),
            PlanStep(step="Implement dark CSS variables", status=PlanStepStatus.COMPLETED),
        ],
        agent_diff="diff --git a/src/ThemeContext.tsx b/src/ThemeContext.tsx\nnew file mode 100644\n--- /dev/null\n+++ b/src/ThemeContext.tsx\n@@ -0,0 +1,30 @@\n+import React from 'react';\n+export const ThemeContext = React.createContext({});\n",
        review_result=ReviewResult(
            criteria_results=[
                CriterionResult(criterion="Dark mode toggle visible on settings page", status=CriterionStatus.PASS, explanation="Toggle switch component rendered in SettingsPage with proper styling"),
                CriterionResult(criterion="Toggling switches app to dark colors", status=CriterionStatus.PASS, explanation="CSS variables switch between light and dark palettes via data-theme attribute"),
                CriterionResult(criterion="Toggle state persists on page refresh", status=CriterionStatus.PASS, explanation="useEffect reads from localStorage on mount, toggle writes on change"),
            ],
            summary="Dark mode implementation is clean. Uses CSS custom properties with a data-theme attribute toggle. State persists correctly via localStorage.",
            raw_review_text="The dark mode feature is well-implemented using a theme context pattern...",
            files_changed=4,
            risk_level=RiskLevel.LOW,
        ),
        outputs=TicketOutputs(
            before_screenshots={"/": "before/root.png", "/settings": "before/settings.png"},
            after_screenshots={"/": "after/root.png", "/settings": "after/settings.png"},
            diff_heatmaps={"/": "diff/root-diff.png", "/settings": "diff/settings-diff.png"},
            video_path=None,
            remotion_video_path="video/demo.mp4",
            markdown_path="markdown/summary.md",
            pdf_path="report/summary.pdf",
        ),
    )
    save_ticket(review_ticket)

    # ---- Ticket 3: TODO (ready to build live) ----
    todo_ticket = Ticket(
        id="demo-todo-003",
        title="Add a contact page with a form",
        description="Add a new /contact route with a contact form. The form should have name, email, and message fields with a submit button. The page should be accessible from the navigation. This affects the / and /contact routes.",
        acceptance_criteria=[
            "Contact page exists at /contact route",
            "Form has name, email, and message fields",
            "Submit button is present and styled",
        ],
        target_repo=DEMO_REPO,
        output_preferences=OutputPreferences(screenshots=True, pixel_diff=True, video=False, markdown=True),
        status=TicketStatus.TODO,
        created_at=utc_now_iso(),
    )
    save_ticket(todo_ticket)

    # ---- Ticket 4: TODO (another option) ----
    todo_ticket2 = Ticket(
        id="demo-todo-004",
        title="Add search functionality to the header",
        description="Add a search bar to the app header that filters content on the page. When the user types, results should update in real-time. This affects the / route.",
        acceptance_criteria=[
            "Search input visible in the header",
            "Typing filters displayed content in real-time",
            "Empty search shows all content",
        ],
        target_repo=DEMO_REPO,
        output_preferences=OutputPreferences(screenshots=True, pixel_diff=False, video=False, markdown=True),
        status=TicketStatus.TODO,
        created_at=utc_now_iso(),
    )
    save_ticket(todo_ticket2)

    logger.info("=== DEMO DATA SEEDED: 1 done, 1 review, 2 todo ===")


def ensure_demo_outputs() -> None:
    """Create placeholder output directories for seeded tickets.
    
    YOU should replace these with real files from a previous run:
    - Copy a real Remotion demo.mp4 into outputs/demo-done-001/video/demo.mp4
    - Copy real screenshots into outputs/demo-review-002/before/ etc.
    - Copy a real PDF into outputs/demo-review-002/report/summary.pdf
    """
    outputs_root = Path(__file__).resolve().parent.parent / "outputs"
    
    for ticket_id in ["demo-done-001", "demo-review-002"]:
        for subdir in ["before", "after", "diff", "video", "markdown", "report"]:
            (outputs_root / ticket_id / subdir).mkdir(parents=True, exist_ok=True)
    
    logger.info(
        "Output directories created. Place your real files in:\n"
        "  outputs/demo-done-001/  (done ticket outputs)\n"
        "  outputs/demo-review-002/  (review ticket outputs)\n"
        "Needed files: before/root.png, after/root.png, diff/root-diff.png,\n"
        "  video/demo.mp4, markdown/summary.md, report/summary.pdf"
    )
