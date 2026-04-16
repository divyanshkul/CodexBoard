from __future__ import annotations

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        self.active_connections = [ws for ws in self.active_connections if ws is not websocket]

    async def broadcast(self, message: dict) -> None:
        stale: list[WebSocket] = []
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                stale.append(connection)
        for connection in stale:
            self.disconnect(connection)

    async def send_ticket_event(self, event_type: str, ticket_id: str, data: dict) -> None:
        await self.broadcast(
            {
                "type": event_type,
                "ticket_id": ticket_id,
                "data": data,
            }
        )
