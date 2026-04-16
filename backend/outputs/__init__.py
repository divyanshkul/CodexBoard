from __future__ import annotations

import os
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_OUTPUTS_ROOT = REPO_ROOT / "outputs"


def get_outputs_root() -> Path:
    return Path(os.getenv("CODEXBOARD_OUTPUTS_ROOT", str(DEFAULT_OUTPUTS_ROOT)))


def ensure_ticket_output_dir(ticket_id: str) -> Path:
    path = get_outputs_root() / ticket_id
    path.mkdir(parents=True, exist_ok=True)
    return path
