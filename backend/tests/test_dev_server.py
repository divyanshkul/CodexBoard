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
        self.pid = 99999  # Fake PID for process group ops

    def terminate(self) -> None:
        self.terminated = True
        self.returncode = 0

    def kill(self) -> None:
        self.returncode = -9

    async def wait(self) -> int:
        return self.returncode or 0

    async def communicate(self):
        return b"", b""


@pytest.mark.asyncio
async def test_dev_server_start_and_stop(monkeypatch: pytest.MonkeyPatch, tmp_path):
    fake_proc = FakeProcess()

    # Create node_modules so _ensure_node_modules doesn't try npm install
    (tmp_path / "node_modules" / ".package-lock.json").parent.mkdir(parents=True)
    (tmp_path / "node_modules" / ".package-lock.json").touch()

    async def fake_create_subprocess_exec(*args, **kwargs):
        return fake_proc

    async def fake_wait_until_ready(self, port: int, timeout: int = 30) -> None:
        return None

    async def fake_force_kill_port(port: int) -> None:
        return None

    monkeypatch.setattr(dev_server.asyncio, "create_subprocess_shell", fake_create_subprocess_exec)
    monkeypatch.setattr(DevServerManager, "_wait_until_ready", fake_wait_until_ready)
    monkeypatch.setattr(dev_server, "_force_kill_port", fake_force_kill_port)
    # Mock os.setsid and os.getpgid since the fake process isn't real
    monkeypatch.setattr(dev_server.os, "setsid", lambda: None)
    monkeypatch.setattr(dev_server.os, "getpgid", lambda pid: pid)
    monkeypatch.setattr(dev_server.os, "killpg", lambda pgid, sig: None)

    manager = DevServerManager()
    await manager.start(str(tmp_path), "python -m http.server 8000", 8000, timeout=10)
    assert manager.proc is fake_proc
    assert manager.port == 8000

    await manager.stop()
    assert manager.proc is None
