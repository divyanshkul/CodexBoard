from __future__ import annotations

from pathlib import Path

from outputs import ensure_ticket_output_dir
from outputs.screenshots import PNG_1X1, route_to_filename


async def generate_diff_heatmaps(
    ticket_id: str,
    before_screenshots: dict[str, str],
    after_screenshots: dict[str, str],
) -> dict[str, str]:
    ticket_dir = ensure_ticket_output_dir(ticket_id)
    output_dir = ticket_dir / "diff"
    output_dir.mkdir(parents=True, exist_ok=True)
    saved: dict[str, str] = {}
    for route in before_screenshots.keys() & after_screenshots.keys():
        filename = route_to_filename(route)
        file_path = output_dir / filename
        file_path.write_bytes(PNG_1X1)
        saved[route] = str(Path("diff") / filename)
    return saved
