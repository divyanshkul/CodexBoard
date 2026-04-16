from __future__ import annotations

from collections.abc import Iterable
from typing import Any

from models import AgentLog, Ticket

tickets: dict[str, Ticket] = {}


def get_ticket(ticket_id: str) -> Ticket | None:
    return tickets.get(ticket_id)


def get_all_tickets() -> list[Ticket]:
    return list(tickets.values())


def save_ticket(ticket: Ticket) -> Ticket:
    tickets[ticket.id] = ticket
    return ticket


def update_ticket(ticket_id: str, **kwargs: Any) -> Ticket:
    ticket = tickets[ticket_id]
    updated = ticket.model_copy(update=kwargs)
    tickets[ticket_id] = updated
    return updated


def replace_many(values: Iterable[Ticket]) -> None:
    tickets.clear()
    for ticket in values:
        tickets[ticket.id] = ticket


def append_log(ticket_id: str, log_entry: AgentLog) -> Ticket:
    ticket = tickets[ticket_id]
    updated = ticket.model_copy(update={"agent_logs": [*ticket.agent_logs, log_entry]})
    tickets[ticket_id] = updated
    return updated


def clear_state() -> None:
    tickets.clear()
