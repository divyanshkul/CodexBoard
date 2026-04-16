from __future__ import annotations

import base64
from pathlib import Path

from models import Ticket
from outputs import ensure_ticket_output_dir


PNG_1X1 = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z2ioAAAAASUVORK5CYII="
)


def route_to_filename(route: str) -> str:
    cleaned = route.strip("/") or "root"
    return cleaned.replace("/", "_") + ".png"


async def capture_before_screenshots(ticket: Ticket, routes: list[str] | None = None) -> dict[str, str]:
    return await _write_screenshots(ticket.id, "before", routes or ["/"])


async def capture_after_screenshots(ticket: Ticket, routes: list[str] | None = None) -> dict[str, str]:
    return await _write_screenshots(ticket.id, "after", routes or ["/"])


async def _write_screenshots(ticket_id: str, label: str, routes: list[str]) -> dict[str, str]:
    ticket_dir = ensure_ticket_output_dir(ticket_id)
    output_dir = ticket_dir / label
    output_dir.mkdir(parents=True, exist_ok=True)
    saved: dict[str, str] = {}
    for route in routes:
        filename = route_to_filename(route)
        file_path = output_dir / filename
        file_path.write_bytes(PNG_1X1)
        saved[route] = str(Path(label) / filename)
    return saved
