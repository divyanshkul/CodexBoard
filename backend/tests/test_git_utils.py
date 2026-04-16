from __future__ import annotations

import asyncio
from pathlib import Path

import pytest

from git_utils import create_worktree, remove_worktree


async def run(*args: str, cwd: str | None = None) -> None:
    proc = await asyncio.create_subprocess_exec(
        *args,
        cwd=cwd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    assert proc.returncode == 0, stderr.decode() or stdout.decode()


@pytest.mark.asyncio
async def test_create_and_remove_worktree(tmp_path: Path):
    repo = tmp_path / "repo"
    repo.mkdir()
    await run("git", "init", cwd=str(repo))
    await run("git", "config", "user.email", "test@example.com", cwd=str(repo))
    await run("git", "config", "user.name", "Test User", cwd=str(repo))
    (repo / "README.md").write_text("hello")
    await run("git", "add", "README.md", cwd=str(repo))
    await run("git", "commit", "-m", "init", cwd=str(repo))

    worktree_path = await create_worktree(str(repo), "ticket-1")
    assert Path(worktree_path).exists()

    await remove_worktree(str(repo), worktree_path)
    assert not Path(worktree_path).exists()
