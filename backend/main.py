from __future__ import annotations

import asyncio
from pathlib import Path

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from git_utils import remove_worktree
from models import CreateTicketRequest, RejectTicketRequest, Ticket, TicketStatus, utc_now_iso
from outputs import get_outputs_root
from pipeline import run_pipeline
from state import get_all_tickets, get_ticket, save_ticket, update_ticket
from ws_manager import ConnectionManager


app = FastAPI(title="CodexBoard API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

manager = ConnectionManager()
background_tasks: set[asyncio.Task] = set()


@app.on_event("startup")
def _startup_seed():
    """Seed demo data on startup if SEED_DEMO is set."""
    from seed_demo import seed_demo_data
    seed_demo_data()


def spawn_task(coro: asyncio.Future | asyncio.Task | asyncio.coroutines) -> None:
    task = asyncio.create_task(coro)
    background_tasks.add(task)
    task.add_done_callback(background_tasks.discard)


@app.get("/api/tickets", response_model=list[Ticket])
async def list_tickets() -> list[Ticket]:
    return get_all_tickets()


@app.post("/api/tickets", response_model=Ticket)
async def create_ticket(request: CreateTicketRequest) -> Ticket:
    ticket = Ticket(**request.model_dump())
    return save_ticket(ticket)


@app.get("/api/tickets/{ticket_id}", response_model=Ticket)
async def get_ticket_by_id(ticket_id: str) -> Ticket:
    ticket = get_ticket(ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@app.post("/api/tickets/{ticket_id}/build", response_model=Ticket)
async def start_build(ticket_id: str) -> Ticket:
    ticket = get_ticket(ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket.status not in {TicketStatus.TODO, TicketStatus.FAILED}:
        raise HTTPException(status_code=400, detail="Ticket cannot be built from its current status")

    updated = update_ticket(
        ticket_id,
        status=TicketStatus.IN_PROGRESS,
        build_started_at=utc_now_iso(),
        build_completed_at=None,
        build_duration_seconds=None,
        agent_plan=None,
        agent_diff=None,
        agent_logs=[],
        review_result=None,
        last_error=None,
        current_phase="building",
    )
    await manager.send_ticket_event(
        "ticket_status_changed",
        ticket_id,
        {"status": updated.status.value, "ticket": updated.model_dump()},
    )
    spawn_task(run_pipeline(updated, manager))
    return updated


@app.post("/api/tickets/{ticket_id}/approve", response_model=Ticket)
async def approve_ticket(ticket_id: str) -> Ticket:
    ticket = get_ticket(ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket.status != TicketStatus.REVIEW:
        raise HTTPException(status_code=400, detail="Only review tickets can be approved")

    if ticket.worktree_path:
        try:
            await remove_worktree(ticket.target_repo, ticket.worktree_path)
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Failed to clean up worktree: {exc}") from exc

    updated = update_ticket(
        ticket_id,
        status=TicketStatus.DONE,
        current_phase=None,
        last_error=None,
        worktree_path=None,
    )
    await manager.send_ticket_event(
        "ticket_status_changed",
        ticket_id,
        {"status": updated.status.value, "ticket": updated.model_dump()},
    )
    return updated


@app.post("/api/tickets/{ticket_id}/reject", response_model=Ticket)
async def reject_ticket(ticket_id: str, request: RejectTicketRequest) -> Ticket:
    ticket = get_ticket(ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket.status != TicketStatus.REVIEW:
        raise HTTPException(status_code=400, detail="Only review tickets can be rejected")

    updated = update_ticket(
        ticket_id,
        status=TicketStatus.IN_PROGRESS,
        rejection_feedback=request.feedback,
        build_started_at=utc_now_iso(),
        build_completed_at=None,
        build_duration_seconds=None,
        agent_plan=None,
        agent_diff=None,
        agent_logs=[],
        review_result=None,
        last_error=None,
        current_phase="building",
    )
    await manager.send_ticket_event(
        "ticket_status_changed",
        ticket_id,
        {"status": updated.status.value, "ticket": updated.model_dump()},
    )
    spawn_task(run_pipeline(updated, manager))
    return updated


@app.get("/outputs/{ticket_id}/{path:path}")
async def serve_output(ticket_id: str, path: str) -> FileResponse:
    file_path = get_outputs_root() / ticket_id / path
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
