"""Dev server subprocess lifecycle manager.

Starts a development server (e.g. ``npm run dev``) pointing at either the
original repo (for *before* screenshots) or a git worktree (for *after*
screenshots / video recording), waits for the port to become ready, and
provides a clean shutdown.

FOOLPROOF VERSION:
- Force-kills anything on the target port before starting
- Checks both IPv4 and IPv6 (Vite 8+ defaults to IPv6)
- Kills the entire process group on stop (npm + node children)
- npm install in cwd if node_modules is missing (worktree support)
- Loud logging at every step
"""
from __future__ import annotations

import asyncio
import logging
import os
import shlex
import signal
import socket
import subprocess
import time
from asyncio.subprocess import Process
from pathlib import Path

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
        """Start the dev server and wait for the port to accept connections."""
        if self.proc is not None:
            await self.stop()

        # Step 1: Force-kill anything already on this port
        await _force_kill_port(port)

        # Step 2: Ensure node_modules exists (worktrees don't have them)
        await _ensure_node_modules(cwd)

        # Step 3: Set up environment
        env = os.environ.copy()
        env["PORT"] = str(port)
        env["BROWSER"] = "none"  # prevent Vite auto-open

        # Step 4: Build command with port flag
        full_command = f"{command} -- --port {port}"
        logger.info(
            "[DevServer] Starting: %s (cwd=%s, port=%d)", full_command, cwd, port
        )

        # Step 5: Spawn via shell so PATH includes node/npm/npx
        # Using create_subprocess_shell instead of exec so the user's
        # PATH is inherited (fixes "vite: command not found" in worktrees)
        try:
            self.proc = await asyncio.create_subprocess_shell(
                full_command,
                cwd=cwd,
                env=env,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                preexec_fn=os.setsid,
            )
        except Exception as e:
            logger.error("[DevServer] Failed to spawn: %s", e)
            raise RuntimeError(f"Could not spawn dev server: {e}") from e

        self.port = port

        # Step 6: Wait for port (with early-exit detection)
        try:
            await self._wait_until_ready(port, timeout=timeout)
        except Exception:
            # Dump stderr for debugging
            stderr_text = ""
            if self.proc and self.proc.stderr:
                try:
                    stderr_bytes = await asyncio.wait_for(
                        self.proc.stderr.read(4096), timeout=2
                    )
                    stderr_text = stderr_bytes.decode(errors="replace")
                except Exception:
                    pass
            logger.error(
                "[DevServer] Port %d never became ready. stderr: %s",
                port,
                stderr_text[:500],
            )
            await self.stop()  # Clean up the zombie process
            raise

        logger.info("[DevServer] Ready on port %d (pid=%s)", port, self.proc.pid)

    async def stop(self) -> None:
        """Kill the dev server and ALL child processes."""
        if self.proc is None:
            return

        pid = self.proc.pid
        port = self.port

        if self.proc.returncode is None:
            try:
                pgid = os.getpgid(pid)
                os.killpg(pgid, signal.SIGTERM)
                await asyncio.wait_for(self.proc.wait(), timeout=5)
                logger.info("[DevServer] Stopped gracefully (port=%s, pid=%s)", port, pid)
            except (asyncio.TimeoutError, ProcessLookupError):
                try:
                    os.killpg(os.getpgid(pid), signal.SIGKILL)
                except ProcessLookupError:
                    pass
                try:
                    await self.proc.wait()
                except Exception:
                    pass
                logger.info("[DevServer] Force-killed (port=%s, pid=%s)", port, pid)

        self.proc = None
        self.port = None

        # Double-check: force-kill anything still on the port
        if port is not None:
            await _force_kill_port(port)

    # -- Helpers ----------------------------------------------------------

    @property
    def url(self) -> str:
        if self.port is None:
            raise RuntimeError("Dev server is not running")
        return f"http://localhost:{self.port}"

    async def _wait_until_ready(self, port: int, timeout: int = 30) -> None:
        deadline = time.monotonic() + timeout
        attempt = 0
        while time.monotonic() < deadline:
            # Check if process died
            if self.proc is not None and self.proc.returncode is not None:
                raise RuntimeError(
                    f"Dev server exited early with code {self.proc.returncode}"
                )
            if _is_port_open(port):
                await asyncio.sleep(1)  # Let it fully initialize
                logger.info(
                    "[DevServer] Port %d open after %d checks", port, attempt
                )
                return
            attempt += 1
            await asyncio.sleep(0.5)

        raise TimeoutError(
            f"Dev server on port {port} not ready after {timeout}s ({attempt} checks)"
        )


# ------------------------------------------------------------------
# Module-level helpers
# ------------------------------------------------------------------

def _is_port_open(port: int) -> bool:
    """Check if a port is accepting connections (tries both IPv4 and IPv6)."""
    for family, host in [
        (socket.AF_INET6, "::1"),
        (socket.AF_INET, "127.0.0.1"),
    ]:
        try:
            with socket.socket(family, socket.SOCK_STREAM) as sock:
                sock.settimeout(0.3)
                if sock.connect_ex((host, port)) == 0:
                    return True
        except OSError:
            continue
    return False


async def _force_kill_port(port: int) -> None:
    """Kill any process listening on a port. Runs lsof + kill -9."""
    try:
        result = subprocess.run(
            ["lsof", f"-ti:{port}"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        pids = result.stdout.strip().split("\n")
        pids = [p.strip() for p in pids if p.strip()]
        if pids:
            logger.warning(
                "[DevServer] Port %d in use by PIDs %s -- killing", port, pids
            )
            for pid in pids:
                try:
                    os.kill(int(pid), signal.SIGKILL)
                except (ProcessLookupError, ValueError):
                    pass
            await asyncio.sleep(0.5)  # Let OS reclaim the port
    except Exception:
        pass  # lsof not available or other OS issue -- proceed anyway


async def _ensure_node_modules(cwd: str) -> None:
    """Run npm install if node_modules is missing or empty."""
    cwd_path = Path(cwd)
    if not cwd_path.is_dir():
        logger.warning("[DevServer] cwd does not exist: %s -- skipping npm install", cwd)
        return
    if not (cwd_path / "package.json").exists():
        logger.warning("[DevServer] No package.json in %s -- skipping npm install", cwd)
        return
    node_modules = cwd_path / "node_modules"
    if node_modules.is_dir() and any(node_modules.iterdir()):
        return

    logger.info("[DevServer] node_modules missing in %s, running npm install", cwd)
    try:
        proc = await asyncio.create_subprocess_exec(
            "npm", "install",
            cwd=cwd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=120)
        if proc.returncode != 0:
            logger.warning(
                "[DevServer] npm install failed (exit %d): %s",
                proc.returncode,
                stderr.decode(errors="replace")[:300],
            )
        else:
            logger.info("[DevServer] npm install completed in %s", cwd)
    except asyncio.TimeoutError:
        logger.warning("[DevServer] npm install timed out in %s", cwd)
    except Exception as e:
        logger.warning("[DevServer] npm install error: %s", e)
