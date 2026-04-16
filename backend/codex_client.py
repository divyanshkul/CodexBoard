from __future__ import annotations

import asyncio
import contextlib
import json
from collections.abc import AsyncIterator
from typing import Any


def is_notification(message: dict[str, Any]) -> bool:
    return "method" in message and "id" not in message


def is_server_request(message: dict[str, Any]) -> bool:
    return "method" in message and "id" in message


def is_response(message: dict[str, Any]) -> bool:
    return "id" in message and "method" not in message


class CodexAppServerError(RuntimeError):
    pass


class CodexAppServerClient:
    def __init__(self) -> None:
        self.proc: asyncio.subprocess.Process | None = None
        self._request_id = 0
        self._pending_requests: dict[int, asyncio.Future[dict[str, Any]]] = {}
        self._notifications: asyncio.Queue[dict[str, Any] | None] = asyncio.Queue()
        self._reader_task: asyncio.Task[None] | None = None
        self._stderr_task: asyncio.Task[None] | None = None
        self._stderr_lines: list[str] = []
        self._reader_error: Exception | None = None

    async def start(self) -> None:
        self.proc = await asyncio.create_subprocess_exec(
            "codex",
            "app-server",
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        self._stderr_task = asyncio.create_task(self._stderr_loop())
        self._reader_task = asyncio.create_task(self._reader_loop())
        await self.send_request(
            "initialize",
            {
                "clientInfo": {
                    "name": "codexboard",
                    "title": "CodexBoard",
                    "version": "0.1.0",
                },
                "capabilities": {
                    "experimentalApi": True,
                },
            },
        )
        await self.send_notification("initialized")

    async def stop(self) -> None:
        reader_task = self._reader_task
        stderr_task = self._stderr_task

        if self.proc is not None and self.proc.stdin is not None:
            with contextlib.suppress(Exception):
                self.proc.stdin.close()

        if self.proc is not None and self.proc.returncode is None:
            self.proc.terminate()
            try:
                await asyncio.wait_for(self.proc.wait(), timeout=5)
            except asyncio.TimeoutError:
                self.proc.kill()
                await self.proc.wait()

        if reader_task is not None:
            reader_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await reader_task
        self._reader_task = None

        if stderr_task is not None:
            stderr_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await stderr_task
        self._stderr_task = None

        while self._pending_requests:
            _, future = self._pending_requests.popitem()
            if not future.done():
                future.set_exception(CodexAppServerError(self._format_process_error()))

        await self._notifications.put(None)
        self.proc = None

    async def send_request(self, method: str, params: dict[str, Any]) -> dict[str, Any]:
        self._ensure_running()
        request_id = self._request_id
        self._request_id += 1
        loop = asyncio.get_running_loop()
        future: asyncio.Future[dict[str, Any]] = loop.create_future()
        self._pending_requests[request_id] = future
        await self._write_message({"id": request_id, "method": method, "params": params})
        if self._reader_task is not None:
            try:
                response = await future
            finally:
                self._pending_requests.pop(request_id, None)
        else:
            response = await future
            self._pending_requests.pop(request_id, None)

        if "error" in response:
            error = response["error"]
            message = error.get("message", f"{method} failed")
            raise CodexAppServerError(f"{message}\n{self._format_process_error()}".strip())
        return response

    async def send_notification(self, method: str, params: dict[str, Any] | None = None) -> None:
        payload: dict[str, Any] = {"method": method}
        if params is not None:
            payload["params"] = params
        await self._write_message(payload)

    async def thread_start(
        self,
        model: str,
        cwd: str,
        approval_policy: str = "never",
        sandbox: str = "workspace-write",
    ) -> str:
        response = await self.send_request(
            "thread/start",
            {
                "model": model,
                "cwd": cwd,
                "approvalPolicy": approval_policy,
                "sandbox": sandbox,
            },
        )
        result = response.get("result", {})
        thread_id = result.get("thread", {}).get("id") or result.get("threadId") or ""
        if not thread_id:
            raise CodexAppServerError("thread/start succeeded without returning a thread id")
        return thread_id

    async def turn_start(
        self,
        thread_id: str,
        prompt: str,
        cwd: str | None = None,
        approval_policy: str | None = None,
    ) -> str:
        params: dict[str, Any] = {
            "threadId": thread_id,
            "input": [{"type": "text", "text": prompt}],
        }
        if cwd is not None:
            params["cwd"] = cwd
        if approval_policy is not None:
            params["approvalPolicy"] = approval_policy
        response = await self.send_request(
            "turn/start",
            params,
        )
        result = response.get("result", {})
        turn_id = result.get("turn", {}).get("id") or result.get("turnId") or ""
        if not turn_id:
            raise CodexAppServerError("turn/start succeeded without returning a turn id")
        return turn_id

    async def review_start(
        self,
        thread_id: str,
        target: dict[str, Any],
        delivery: str = "inline",
    ) -> str:
        response = await self.send_request(
            "review/start",
            {"threadId": thread_id, "target": target, "delivery": delivery},
        )
        result = response.get("result", {})
        turn_id = result.get("turn", {}).get("id") or result.get("turnId") or ""
        if not turn_id:
            raise CodexAppServerError("review/start succeeded without returning a turn id")
        return turn_id

    async def turn_interrupt(self, thread_id: str, turn_id: str) -> None:
        await self.send_request("turn/interrupt", {"threadId": thread_id, "turnId": turn_id})

    async def read_notifications(self) -> AsyncIterator[dict[str, Any]]:
        while True:
            notification = await self._notifications.get()
            if notification is None:
                break
            yield notification

    async def _reader_loop(self) -> None:
        if self.proc is None or self.proc.stdout is None:
            return
        try:
            while True:
                line = await self.proc.stdout.readline()
                if not line:
                    break
                message = json.loads(line.decode())
                if is_response(message):
                    future = self._pending_requests.get(int(message["id"]))
                    if future is not None and not future.done():
                        future.set_result(message)
                elif is_server_request(message):
                    await self._handle_server_request(message)
                elif is_notification(message):
                    await self._notifications.put(message)
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            self._reader_error = exc
        finally:
            error = self._reader_error
            if error is None and self.proc is not None and self.proc.returncode not in (None, 0):
                error = CodexAppServerError(self._format_process_error())
            if error is not None:
                for future in self._pending_requests.values():
                    if not future.done():
                        future.set_exception(error)
            await self._notifications.put(None)

    async def _stderr_loop(self) -> None:
        if self.proc is None or self.proc.stderr is None:
            return
        while True:
            line = await self.proc.stderr.readline()
            if not line:
                break
            text = line.decode(errors="replace").rstrip()
            if not text:
                continue
            self._stderr_lines.append(text)
            if len(self._stderr_lines) > 200:
                self._stderr_lines = self._stderr_lines[-200:]

    async def _handle_server_request(self, message: dict[str, Any]) -> None:
        method = str(message.get("method", ""))
        request_id = message.get("id")
        if request_id is None:
            return
        await self._write_message(
            {
                "id": request_id,
                "error": {
                    "code": -32601,
                    "message": (
                        f"CodexBoard client does not implement server request "
                        f"{method!r}. Use approvalPolicy='never' or extend the client."
                    ),
                },
            }
        )

    def _ensure_running(self) -> None:
        if self.proc is None or self.proc.stdin is None or self.proc.returncode is not None:
            raise CodexAppServerError(self._format_process_error())

    def _format_process_error(self) -> str:
        if self._stderr_lines:
            return "\n".join(self._stderr_lines[-20:])
        if self._reader_error is not None:
            return str(self._reader_error)
        if self.proc is not None and self.proc.returncode is not None:
            return f"Codex app-server exited with code {self.proc.returncode}"
        return "Codex app-server is not running"

    async def _write_message(self, payload: dict[str, Any]) -> None:
        self._ensure_running()
        assert self.proc is not None
        assert self.proc.stdin is not None
        self.proc.stdin.write((json.dumps(payload) + "\n").encode())
        await self.proc.stdin.drain()
