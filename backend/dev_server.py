from __future__ import annotations

import asyncio
import os
import shlex
import socket
import time
from asyncio.subprocess import Process


class DevServerManager:
    def __init__(self) -> None:
        self.proc: Process | None = None
        self.port: int | None = None

    async def start(self, cwd: str, command: str, port: int, timeout: int = 30) -> None:
        if self.proc is not None:
            await self.stop()

        env = os.environ.copy()
        env["PORT"] = str(port)
        self.proc = await asyncio.create_subprocess_exec(
            *shlex.split(command),
            cwd=cwd,
            env=env,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        self.port = port
        await self.wait_until_ready(port, timeout=timeout)

    async def wait_until_ready(self, port: int, timeout: int = 30) -> None:
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            if self.proc is not None and self.proc.returncode is not None:
                raise RuntimeError(f"Dev server exited early with code {self.proc.returncode}")
            if is_port_open(port):
                return
            await asyncio.sleep(0.1)
        raise TimeoutError(f"Timed out waiting for dev server on port {port}")

    async def stop(self) -> None:
        if self.proc is None:
            return
        if self.proc.returncode is None:
            self.proc.terminate()
            try:
                await asyncio.wait_for(self.proc.wait(), timeout=5)
            except asyncio.TimeoutError:
                self.proc.kill()
                await self.proc.wait()
        self.proc = None
        self.port = None


def is_port_open(port: int, host: str = "127.0.0.1") -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.2)
        return sock.connect_ex((host, port)) == 0
