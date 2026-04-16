from __future__ import annotations

import pytest

import dev_server
from dev_server import DevServerManager


class FakeProcess:
    def __init__(self) -> None:
        self.returncode = None
        self.terminated = False
        self.stdout = None
        self.stderr = None

    def terminate(self) -> None:
        self.terminated = True
        self.returncode = 0

    def kill(self) -> None:
        self.returncode = -9

    async def wait(self) -> int:
        return self.returncode or 0


@pytest.mark.asyncio
async def test_dev_server_start_and_stop(monkeypatch: pytest.MonkeyPatch, tmp_path):
    fake_proc = FakeProcess()

    async def fake_create_subprocess_exec(*args, **kwargs):
        return fake_proc

    async def fake_wait_until_ready(self, port: int, timeout: int = 30) -> None:
        return None

    monkeypatch.setattr(dev_server.asyncio, "create_subprocess_exec", fake_create_subprocess_exec)
    monkeypatch.setattr(DevServerManager, "_wait_until_ready", fake_wait_until_ready)

    manager = DevServerManager()
    await manager.start(str(tmp_path), "python -m http.server 8000", 8000, timeout=10)
    assert manager.proc is fake_proc
    assert manager.port == 8000

    await manager.stop()
    assert manager.proc is None
    assert fake_proc.terminated is True
