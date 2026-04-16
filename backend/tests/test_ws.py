from __future__ import annotations

import pytest

from ws_manager import ConnectionManager


def test_ws_message_envelope():
    message = {"type": "agent_plan_updated", "ticket_id": "uuid-123", "data": {"plan": []}}
    assert "type" in message
    assert "ticket_id" in message
    assert "data" in message


def test_ws_plan_event_shape():
    plan = [
        {"step": "Analyze codebase", "status": "completed"},
        {"step": "Write code", "status": "inProgress"},
    ]
    for entry in plan:
        assert "step" in entry
        assert entry["status"] in ("pending", "inProgress", "completed")


class FakeWebSocket:
    def __init__(self) -> None:
        self.messages: list[dict] = []

    async def send_json(self, message: dict) -> None:
        self.messages.append(message)


@pytest.mark.asyncio
async def test_ws_broadcast_roundtrip():
    manager = ConnectionManager()
    websocket = FakeWebSocket()
    manager.active_connections.append(websocket)  # type: ignore[arg-type]

    await manager.send_ticket_event(
        "ticket_status_changed",
        "ticket-1",
        {"status": "in_progress", "ticket": {"id": "ticket-1"}},
    )

    message = websocket.messages[0]
    assert message["type"] == "ticket_status_changed"
    assert message["ticket_id"] == "ticket-1"
