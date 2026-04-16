"""Dev server subprocess lifecycle manager.

Starts a development server (e.g. ``npm run dev``) pointing at either the
original repo (for *before* screenshots) or a git worktree (for *after*
screenshots / video recording), waits for the port to become ready, and
provides a clean shutdown.
"""
from __future__ import annotations

import asyncio
import logging
import os
import shlex
import socket
import time
from asyncio.subprocess import Process

logger = logging.getLogger(__name__)


class DevServerManager:
    """Manages a single dev-server subprocess."""

    def __init__(self) -> None:
        self.proc: Process | None = None
        self.port: int | None = None

    # -- Lifecycle --------------------------------------------------------

    async def start(
        self,
        cwd: str,
        command: str,
        port: int,
        timeout: int = 30,
    ) -> None:
        """Start the dev server and wait for the port to accept connections.

        For Vite projects the *command* is typically ``npm run dev``.  The
        port override is passed via both the ``PORT`` env-var **and** the
        ``-- --port <port>`` CLI suffix so that Vite picks it up regardless
        of how the npm script is configured.
        """
        if self.proc is not None:
            await self.stop()

        env = os.environ.copy()
        env["PORT"] = str(port)
        env["BROWSER"] = "none"  # prevent auto-open

        # Append Vite-style port flag
        full_command = f"{command} -- --port {port}"
        logger.info("Starting dev server: %s  (cwd=%s, port=%d)", full_command, cwd, port)

        self.proc = await asyncio.create_subprocess_exec(
            *shlex.split(full_command),
            cwd=cwd,
            env=env,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        self.port = port
        await self._wait_until_ready(port, timeout=timeout)
        logger.info("Dev server ready on port %d", port)

    async def stop(self) -> None:
        """Terminate the dev server (SIGTERM, then SIGKILL)."""
        if self.proc is None:
            return
        if self.proc.returncode is None:
            self.proc.terminate()
            try:
                await asyncio.wait_for(self.proc.wait(), timeout=5)
            except asyncio.TimeoutError:
                self.proc.kill()
                await self.proc.wait()
        logger.info("Dev server on port %s stopped", self.port)
        self.proc = None
        self.port = None

    # -- Helpers ----------------------------------------------------------

    @property
    def url(self) -> str:
        """Base URL of the running dev server, e.g. ``http://localhost:5173``."""
        if self.port is None:
            raise RuntimeError("Dev server is not running")
        return f"http://localhost:{self.port}"

    async def _wait_until_ready(self, port: int, timeout: int = 30) -> None:
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            if self.proc is not None and self.proc.returncode is not None:
                raise RuntimeError(
                    f"Dev server exited early with code {self.proc.returncode}"
                )
            if _is_port_open(port):
                # Give the server an extra moment to finish initialising
                await asyncio.sleep(1)
                return
            await asyncio.sleep(0.25)
        raise TimeoutError(
            f"Timed out waiting for dev server on port {port} after {timeout}s"
        )


def _is_port_open(port: int, host: str = "127.0.0.1") -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.2)
        return sock.connect_ex((host, port)) == 0
