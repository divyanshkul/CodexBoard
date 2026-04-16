from __future__ import annotations

import asyncio
import os
import shutil
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_WORKSPACES_ROOT = REPO_ROOT / "workspaces"


def get_workspaces_root() -> Path:
    return Path(os.getenv("CODEXBOARD_WORKSPACES_ROOT", str(DEFAULT_WORKSPACES_ROOT)))


async def run_git(*args: str, cwd: str | None = None) -> str:
    proc = await asyncio.create_subprocess_exec(
        "git",
        *args,
        cwd=cwd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    if proc.returncode != 0:
        raise RuntimeError(stderr.decode().strip() or stdout.decode().strip() or "git command failed")
    return stdout.decode().strip()


async def create_worktree(target_repo: str, ticket_id: str) -> str:
    workspaces_root = get_workspaces_root()
    workspaces_root.mkdir(parents=True, exist_ok=True)
    branch_name = f"codexboard-{ticket_id}"
    worktree_path = workspaces_root / ticket_id
    await run_git("-C", target_repo, "worktree", "add", "-B", branch_name, str(worktree_path), "HEAD")
    return str(worktree_path)


async def remove_worktree(target_repo: str, worktree_path: str) -> None:
    try:
        await run_git("-C", target_repo, "worktree", "remove", "--force", worktree_path)
    finally:
        shutil.rmtree(worktree_path, ignore_errors=True)
