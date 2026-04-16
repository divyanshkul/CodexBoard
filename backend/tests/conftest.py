from __future__ import annotations

import os
from pathlib import Path
import sys
import asyncio

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from main import app, background_tasks, manager
from models import OutputPreferences, Ticket
from state import clear_state, save_ticket


@pytest_asyncio.fixture(autouse=True)
async def test_environment(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("MOCK_CODEX", "true")
    monkeypatch.setenv("CODEXBOARD_OUTPUTS_ROOT", str(tmp_path / "outputs"))
    monkeypatch.setenv("CODEXBOARD_WORKSPACES_ROOT", str(tmp_path / "workspaces"))
    clear_state()
    manager.active_connections.clear()
    yield
    clear_state()
    manager.active_connections.clear()
    pending = list(background_tasks)
    for task in pending:
        task.cancel()
    if pending:
        await asyncio.gather(*pending, return_exceptions=True)
    background_tasks.clear()


@pytest.fixture
def sample_ticket(tmp_path: Path) -> Ticket:
    ticket = Ticket(
        title="Test ticket",
        description="Test description affecting /settings",
        acceptance_criteria=["It works", "It looks good"],
        target_repo=str(tmp_path / "repo"),
        output_preferences=OutputPreferences(
            screenshots=True,
            pixel_diff=True,
            video=True,
            markdown=True,
        ),
    )
    save_ticket(ticket)
    return ticket


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as async_client:
        yield async_client
