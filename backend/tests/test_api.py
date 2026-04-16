from __future__ import annotations

import asyncio

from models import TicketStatus
from state import get_ticket


async def test_list_tickets_empty(client):
    response = await client.get("/api/tickets")
    assert response.status_code == 200
    assert response.json() == []


async def test_create_ticket(client):
    response = await client.post(
        "/api/tickets",
        json={
            "title": "Test",
            "description": "Desc",
            "acceptance_criteria": ["It works"],
            "target_repo": "/tmp/test",
            "output_preferences": {
                "screenshots": True,
                "pixel_diff": False,
                "video": False,
                "markdown": False,
            },
        },
    )
    assert response.status_code == 200
    ticket = response.json()
    assert ticket["status"] == "todo"
    assert ticket["output_preferences"]["screenshots"] is True
    assert "id" in ticket


async def test_get_ticket(client, sample_ticket):
    response = await client.get(f"/api/tickets/{sample_ticket.id}")
    assert response.status_code == 200
    assert response.json()["id"] == sample_ticket.id


async def test_get_ticket_not_found(client):
    response = await client.get("/api/tickets/missing")
    assert response.status_code == 404
    assert response.json() == {"detail": "Ticket not found"}


async def test_build_ticket(client, sample_ticket):
    response = await client.post(f"/api/tickets/{sample_ticket.id}/build")
    assert response.status_code == 200
    assert response.json()["status"] == "in_progress"

    # Pipeline runs async -- give it time to complete (mock mode is fast but
    # _try_start_dev_server may attempt and fail on the temp dir)
    for _ in range(40):
        await asyncio.sleep(0.1)
        updated = get_ticket(sample_ticket.id)
        if updated and updated.status in (TicketStatus.REVIEW, TicketStatus.DONE):
            break
    assert updated is not None
    assert updated.status == TicketStatus.REVIEW
    assert updated.review_result is not None


async def test_approve_ticket(client, sample_ticket):
    import main
    from state import update_ticket

    removed: list[tuple[str, str]] = []

    async def fake_remove_worktree(target_repo: str, worktree_path: str) -> None:
        removed.append((target_repo, worktree_path))

    main.remove_worktree = fake_remove_worktree  # type: ignore[assignment]
    update_ticket(
        sample_ticket.id,
        status=TicketStatus.REVIEW,
        worktree_path="/tmp/worktree-path",
    )
    response = await client.post(f"/api/tickets/{sample_ticket.id}/approve")
    assert response.status_code == 200
    assert response.json()["status"] == "done"
    assert response.json()["worktree_path"] is None
    assert removed == [(sample_ticket.target_repo, "/tmp/worktree-path")]


async def test_reject_ticket(client, sample_ticket):
    from state import update_ticket

    update_ticket(sample_ticket.id, status=TicketStatus.REVIEW)
    response = await client.post(
        f"/api/tickets/{sample_ticket.id}/reject",
        json={"feedback": "Button should be red"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "in_progress"
    assert body["rejection_feedback"] == "Button should be red"
