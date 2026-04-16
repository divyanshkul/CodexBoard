from __future__ import annotations

from models import AgentLog, Ticket
from state import append_log, get_all_tickets, get_ticket, save_ticket, update_ticket


def test_state_crud():
    ticket = Ticket(
        title="State test",
        description="desc",
        acceptance_criteria=["works"],
        target_repo="/tmp/repo",
    )
    save_ticket(ticket)
    assert get_ticket(ticket.id) is not None
    assert len(get_all_tickets()) == 1

    updated = update_ticket(ticket.id, title="Updated")
    assert updated.title == "Updated"


def test_append_log():
    ticket = Ticket(
        title="State test",
        description="desc",
        acceptance_criteria=["works"],
        target_repo="/tmp/repo",
    )
    save_ticket(ticket)
    updated = append_log(ticket.id, AgentLog(type="info", message="hello"))
    assert len(updated.agent_logs) == 1
    assert updated.agent_logs[0].message == "hello"
