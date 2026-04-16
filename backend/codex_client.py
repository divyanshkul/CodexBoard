from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncIterator
from typing import Any


def is_notification(message: dict[str, Any]) -> bool:
    return "method" in message and "id" not in message


def is_response(message: dict[str, Any]) -> bool:
    return "id" in message


class CodexAppServerClient:
    def __init__(self) -> None:
        self.proc: asyncio.subprocess.Process | None = None
        self._request_id = 0
        self._pending_requests: dict[int, asyncio.Future[dict[str, Any]]] = {}
        self._notifications: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        self._reader_task: asyncio.Task[None] | None = None

    async def start(self) -> None:
        self.proc = await asyncio.create_subprocess_exec(
            "codex",
            "app-server",
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        self._reader_task = asyncio.create_task(self._reader_loop())
        await self.send_request(
            "initialize",
            {
                "clientInfo": {
                    "name": "codexboard",
                    "title": "CodexBoard",
                    "version": "0.1.0",
                }
            },
        )
        await self.send_notification("initialized", {})

    async def stop(self) -> None:
        if self._reader_task is not None:
            self._reader_task.cancel()
            try:
                await self._reader_task
            except asyncio.CancelledError:
                pass
            self._reader_task = None
        if self.proc is not None and self.proc.returncode is None:
            self.proc.terminate()
            await self.proc.wait()
        self.proc = None

    async def send_request(self, method: str, params: dict[str, Any]) -> dict[str, Any]:
        request_id = self._request_id
        self._request_id += 1
        loop = asyncio.get_running_loop()
        future: asyncio.Future[dict[str, Any]] = loop.create_future()
        self._pending_requests[request_id] = future
        await self._write_message({"id": request_id, "method": method, "params": params})
        return await future

    async def send_notification(self, method: str, params: dict[str, Any]) -> None:
        await self._write_message({"method": method, "params": params})

    async def thread_start(self, model: str, cwd: str) -> str:
        response = await self.send_request("thread/start", {"model": model, "cwd": cwd})
        result = response.get("result", {})
        return result.get("thread", {}).get("id") or result.get("threadId") or ""

    async def turn_start(self, thread_id: str, prompt: str) -> str:
        response = await self.send_request(
            "turn/start",
            {
                "threadId": thread_id,
                "input": [{"type": "text", "text": prompt}],
            },
        )
        result = response.get("result", {})
        return result.get("turn", {}).get("id") or result.get("turnId") or ""

    async def review_start(self, thread_id: str, target: dict[str, Any]) -> None:
        await self.send_request("review/start", {"threadId": thread_id, "target": target})

    async def turn_interrupt(self, thread_id: str, turn_id: str) -> None:
        await self.send_request("turn/interrupt", {"threadId": thread_id, "turnId": turn_id})

    async def read_notifications(self) -> AsyncIterator[dict[str, Any]]:
        while True:
            notification = await self._notifications.get()
            yield notification

    async def _reader_loop(self) -> None:
        if self.proc is None or self.proc.stdout is None:
            return
        while True:
            line = await self.proc.stdout.readline()
            if not line:
                break
            message = json.loads(line.decode())
            if is_response(message):
                future = self._pending_requests.pop(int(message["id"]), None)
                if future is not None and not future.done():
                    future.set_result(message)
            elif is_notification(message):
                await self._notifications.put(message)

    async def _write_message(self, payload: dict[str, Any]) -> None:
        if self.proc is None or self.proc.stdin is None:
            raise RuntimeError("Codex app-server is not running")
        self.proc.stdin.write((json.dumps(payload) + "\n").encode())
        await self.proc.stdin.drain()
