from __future__ import annotations

import asyncio

import pytest

from codex_client import CodexAppServerClient, is_notification, is_response


def test_parse_notification():
    message = {"method": "turn/plan/updated", "params": {"plan": []}}
    assert is_notification(message) is True
    assert is_response(message) is False


def test_parse_response():
    message = {"id": 1, "result": {"thread": {"id": "thr_123"}}}
    assert is_response(message) is True
    assert is_notification(message) is False


@pytest.mark.asyncio
async def test_send_request_shape():
    client = CodexAppServerClient()
    captured: list[dict] = []

    async def fake_write(payload: dict) -> None:
        captured.append(payload)
        future = client._pending_requests[payload["id"]]
        future.set_result({"id": payload["id"], "result": {"ok": True}})

    client._write_message = fake_write  # type: ignore[method-assign]
    response = await client.send_request("initialize", {"clientInfo": {"name": "codexboard"}})
    assert captured[0]["method"] == "initialize"
    assert captured[0]["params"]["clientInfo"]["name"] == "codexboard"
    assert response["result"]["ok"] is True
