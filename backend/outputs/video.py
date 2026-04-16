from __future__ import annotations

from pathlib import Path

from outputs import ensure_ticket_output_dir


async def generate_video(ticket_id: str, title: str) -> str:
    ticket_dir = ensure_ticket_output_dir(ticket_id)
    output_dir = ticket_dir / "video"
    output_dir.mkdir(parents=True, exist_ok=True)
    file_path = output_dir / "walkthrough.mp4"
    file_path.write_bytes(f"Mock walkthrough for {title}".encode())
    return str(Path("video") / file_path.name)
