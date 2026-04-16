from __future__ import annotations

import os
import re
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_OUTPUTS_ROOT = REPO_ROOT / "outputs"


def get_outputs_root() -> Path:
    return Path(os.getenv("CODEXBOARD_OUTPUTS_ROOT", str(DEFAULT_OUTPUTS_ROOT)))


def ensure_ticket_output_dir(ticket_id: str) -> Path:
    path = get_outputs_root() / ticket_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def extract_routes(description: str) -> list[str]:
    """Extract URL paths from ticket description.

    Falls back to ['/'] if none found.
    """
    routes = re.findall(r"(?:^|\s)(\/[a-zA-Z0-9\-\_\/]+)", description)
    return list(set(routes)) if routes else ["/"]


def route_to_filename(route: str) -> str:
    """Convert /settings/profile -> settings-profile"""
    return (route.strip("/").replace("/", "-") or "root") + ".png"
